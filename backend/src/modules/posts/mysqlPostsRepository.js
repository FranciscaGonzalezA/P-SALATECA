import { databasePool } from '../../db/pool.js';
function mysqlDateTimeToIso(value) {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(`${normalized.replace(/Z$/, '')}Z`).toISOString();
}
function parseKeywords(value) {
  if (Array.isArray(value)) {
    return value.filter((keyword) => typeof keyword === 'string');
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((keyword) => typeof keyword === 'string') : [];
  } catch {
    return [];
  }
}
function mapSummary(row) {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    keywords: parseKeywords(row.keywords),
  };
}
const postsSelect = `
  SELECT
    p.id,
    p.title,
    p.body,
    p.image_url,
    p.source_url,
    p.keywords,
    p.created_at,
    p.updated_at,
    s.name AS source_name
  FROM posts p
  INNER JOIN sources s ON s.id = p.source_id
`;
export class MysqlPostsRepository {
  pool;
  constructor(pool = databasePool) {
    this.pool = pool;
  }
  async listPosts() {
    const [rows] = await this.pool.execute(`${postsSelect} ORDER BY p.display_order, p.id`);
    return rows.map(mapSummary);
  }
  async findPost(postId) {
    const [rows] = await this.pool.execute(`${postsSelect} WHERE p.id = ? LIMIT 1`, [postId]);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      ...mapSummary(row),
      body: row.body,
      sourceName: row.source_name,
      sourceUrl: row.source_url,
      createdAt: mysqlDateTimeToIso(row.created_at),
      updatedAt: mysqlDateTimeToIso(row.updated_at),
    };
  }
  async resolveSourceId(connection, input) {
    const [sourceRows] = await connection.execute(
      'SELECT id FROM sources WHERE base_url = ? LIMIT 1',
      [input.sourceUrl],
    );
    const sourceId = sourceRows[0]?.id;
    if (sourceId) {
      await connection.execute(
        `UPDATE sources
         SET name = ?, source_type = 'manual', is_active = TRUE
         WHERE id = ?`,
        [input.sourceName, sourceId],
      );
      return sourceId;
    }
    const [result] = await connection.execute(
      `INSERT INTO sources (name, source_type, base_url)
       VALUES (?, 'manual', ?)`,
      [input.sourceName, input.sourceUrl],
    );
    return result.insertId;
  }
  async createPost(input) {
    const connection = await this.pool.getConnection();
    let postId;
    try {
      await connection.beginTransaction();
      const sourceId = await this.resolveSourceId(connection, input);
      const [result] = await connection.execute(
        `INSERT INTO posts
           (source_id, title, body, image_url, source_url, keywords, display_order)
         SELECT ?, ?, ?, ?, ?, ?, COALESCE(MAX(display_order), 0) + 1
         FROM posts`,
        [
          sourceId,
          input.title,
          input.body,
          input.imageUrl,
          input.sourceUrl,
          JSON.stringify(input.keywords),
        ],
      );
      postId = result.insertId;
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    const post = await this.findPost(postId);
    if (!post) throw new Error('El post recién creado no pudo recuperarse.');
    return post;
  }
  async updatePost(postId, input) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const sourceId = await this.resolveSourceId(connection, input);
      const [result] = await connection.execute(
        `UPDATE posts
         SET source_id = ?, title = ?, body = ?, image_url = ?, source_url = ?, keywords = ?
         WHERE id = ?`,
        [
          sourceId,
          input.title,
          input.body,
          input.imageUrl,
          input.sourceUrl,
          JSON.stringify(input.keywords),
          postId,
        ],
      );
      if (result.affectedRows === 0) {
        await connection.rollback();
        return null;
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.findPost(postId);
  }
  async movePost(postId, direction) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [currentRows] = await connection.execute(
        'SELECT id, display_order FROM posts WHERE id = ? FOR UPDATE',
        [postId],
      );
      const current = currentRows[0];
      if (!current) {
        await connection.rollback();
        return null;
      }
      const comparison = direction === 'up' ? '<' : '>';
      const order = direction === 'up' ? 'DESC' : 'ASC';
      const [neighborRows] = await connection.execute(
        `SELECT id, display_order
         FROM posts
         WHERE display_order ${comparison} ?
         ORDER BY display_order ${order}, id ${order}
         LIMIT 1
         FOR UPDATE`,
        [current.display_order],
      );
      const neighbor = neighborRows[0];
      if (!neighbor) {
        await connection.commit();
        return false;
      }
      await connection.execute(
        `UPDATE posts
         SET display_order = CASE
           WHEN id = ? THEN ?
           WHEN id = ? THEN ?
           ELSE display_order
         END
         WHERE id IN (?, ?)`,
        [
          current.id,
          neighbor.display_order,
          neighbor.id,
          current.display_order,
          current.id,
          neighbor.id,
        ],
      );
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async deletePost(postId) {
    const [result] = await this.pool.execute('DELETE FROM posts WHERE id = ?', [postId]);
    return result.affectedRows > 0;
  }
}
