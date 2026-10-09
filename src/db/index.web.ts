export const DATABASE_NAME = 'paalalay.db';
export async function getDatabase(): Promise<never> { throw new Error('Local SQLite requires a native build. Web API requests require a separately configured development database.'); }
export const initializeDatabase = getDatabase;
export const getMigrationHistory = getDatabase;
export async function closeDatabase(): Promise<void> {}
export * from './types';
export * from './migrations';
