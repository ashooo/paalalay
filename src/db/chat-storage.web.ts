import type { ToolHandlers } from '../contracts/tools';

const unavailable = async (): Promise<never> => { throw new Error('Database testing requires the native development build.'); };
export const prepareChatDatabase = unavailable;
export const testDatabasePersistence = unavailable;
export const readBloodPressure = async (_id: string): Promise<never> => unavailable();
export function createDatabaseToolHandlers(): ToolHandlers { return {}; }
