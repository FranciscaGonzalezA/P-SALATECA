import type { PostDetailDto, PostSummaryDto } from '@salateca/contracts';
import type { Pool, RowDataPacket } from 'mysql2/promise';
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
    const [rows] = await this.pool.execute<PostRow[]>(`${postsSelect} ORDER BY p.id`);
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
}
