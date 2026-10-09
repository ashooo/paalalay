declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css';

declare module 'expo-sqlite' {
  export interface SQLiteDatabase {
    execAsync(sql: string): Promise<void>;
    getAllAsync<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
    runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
    withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;
    closeAsync(): Promise<void>;
  }
  export function openDatabaseAsync(databaseName: string): Promise<SQLiteDatabase>;
}
