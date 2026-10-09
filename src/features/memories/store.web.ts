export async function getMemoryStore(): Promise<ReturnType<typeof import('./repository').createMemoryRepository>> {
  throw new Error('Private memories are available in the native app.');
}
