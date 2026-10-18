import type { Pool } from 'mysql2/promise';
import type { IngestionRepository, IngestionTransaction } from './ingestion.types.js';
export declare class MysqlIngestionRepository implements IngestionRepository {
  private readonly pool;
  constructor(pool?: Pool);
  withTransaction<T>(operation: (transaction: IngestionTransaction) => Promise<T>): Promise<T>;
}
