import type { AdminPostInputDto, PostDetailDto, PostSummaryDto } from '@salateca/contracts';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { databasePool } from '../../db/pool.js';
import type { PostsRepository } from './posts.types.js';

interface PostRow extends RowDataPacket {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  source_url: string;
  keywords: string[] | string;
  source_name: string;
  created_at: string;
  updated_at: string;
}

interface IdRow extends RowDataPacket {
  id: number;
}

interface OrderRow extends IdRow {
  display_order: number;
}

function mysqlDateTimeToIso(value: string): string {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(`${normalized.replace(/Z$/, '')}Z`).toISOString();
}

function parseKeywords(value: PostRow['keywords']): string[] {
  if (Array.isArray(value)) {
    return value.filter((keyword): keyword is string => typeof keyword === 'string');
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((keyword): keyword is string => typeof keyword === 'string')
      : [];
  } catch {
    return [];
  }
}

function mapSummary(row: PostRow): PostSummaryDto {
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

export class MysqlPostsRepository implements PostsRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async listPosts(): Promise<PostSummaryDto[]> {
    const [rows] = await this.pool.execute<PostRow[]>(
      `${postsSelect} ORDER BY p.display_order, p.id`,
    );
    return rows.map(mapSummary);
  }

  async findPost(postId: number): Promise<PostDetailDto | null> {
    const [rows] = await this.pool.execute<PostRow[]>(`${postsSelect} WHERE p.id = ? LIMIT 1`, [
      postId,
    ]);
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

  private async resolveSourceId(
    connection: PoolConnection,
    input: AdminPostInputDto,
  ): Promise<number> {
    const [sourceRows] = await connection.execute<IdRow[]>(
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

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sources (name, source_type, base_url)
       VALUES (?, 'manual', ?)`,
      [input.sourceName, input.sourceUrl],
    );
    return result.insertId;
  }

  async createPost(input: AdminPostInputDto): Promise<PostDetailDto> {
    const connection = await this.pool.getConnection();
    let postId: number;
    try {
      await connection.beginTransaction();
      const sourceId = await this.resolveSourceId(connection, input);
      const [result] = await connection.execute<ResultSetHeader>(
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

  async updatePost(postId: number, input: AdminPostInputDto): Promise<PostDetailDto | null> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const sourceId = await this.resolveSourceId(connection, input);
      const [result] = await connection.execute<ResultSetHeader>(
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

  async movePost(postId: number, direction: 'up' | 'down'): Promise<boolean | null> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [currentRows] = await connection.execute<OrderRow[]>(
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
      const [neighborRows] = await connection.execute<OrderRow[]>(
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

  async deletePost(postId: number): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>('DELETE FROM posts WHERE id = ?', [
      postId,
    ]);
    return result.affectedRows > 0;
  }
}
