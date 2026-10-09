import type { ToolHandlers } from '../contracts/tools';
import type { createMemoryRepository } from '../features/memories/repository';
export function createMemoryToolHandlers(load = async () => (await import('../features/memories/store')).getMemoryStore()): ToolHandlers {
  return {
    list_memories: async () => ({ status: 'success', data: { memories: await (await load()).list() } }),
    remember_memory: async ({ text }) => { const memory = await (await load()).save(text); return { status: 'success', data: { memory_id: memory.id, text: memory.text } }; },
    forget_memory: async ({ memory_id, text }) => { await (await load()).forget(memory_id, text); return { status: 'success', data: { memory_id, forgotten: true } }; },
  };
}
export type MemoryStore = ReturnType<typeof createMemoryRepository>;
