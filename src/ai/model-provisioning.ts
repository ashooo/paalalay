import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { sha256 } from '@noble/hashes/sha2.js';
import { MODEL_ASSET, prepareModelAsset } from './model-asset';

export async function prepareLocalModel(signal: AbortSignal, status: (text: string) => void) {
  const directory = new Directory(Paths.document, 'models');
  await directory.create({ intermediates: true, idempotent: true });
  const canonical = new File(directory, 'paalalay-qwen3-q8-v1.gguf');
  const legacy = new File(directory, MODEL_ASSET.name);
  const files = new Map<string, File>([canonical, legacy].map(file => [file.uri, file]));
  const resolve = (uri: string) => files.get(uri) ?? new File(uri);
  return prepareModelAsset({
    existing: async () => [canonical, legacy].filter(file => file.exists).map(file => file.uri),
    size: uri => resolve(uri).size,
    hash: async (uri, cancellation) => {
      const handle = resolve(uri).open(FileMode.ReadOnly);
      const digest = sha256.create();
      try {
        let remaining = resolve(uri).size;
        while (remaining > 0) {
          if (cancellation.aborted) throw new Error('Preparation cancelled.');
          const chunk = handle.readBytes(Math.min(1024 * 1024, remaining));
          if (!chunk.length) throw new Error('Could not read the assistant file.');
          digest.update(chunk); remaining -= chunk.length;
          // Bound memory and keep the interface responsive during a large-file check.
          await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        return Array.from(digest.digest(), byte => byte.toString(16).padStart(2, '0')).join('');
      } finally { handle.close(); digest.destroy(); }
    },
    download: async (url, cancellation, progress) => {
      if (Paths.availableDiskSpace < MODEL_ASSET.bytes + 128 * 1024 * 1024) throw new Error('Free at least 800 MB of phone storage for the offline assistant.');
      const temporary = new File(directory, `download-${Date.now()}.partial`);
      try {
        await File.downloadFileAsync(url, temporary, { signal: cancellation, onProgress: ({ bytesWritten }) => progress(Math.min(100, Math.floor(100 * bytesWritten / MODEL_ASSET.bytes))) });
        return temporary.uri;
      } catch {
        if (temporary.exists) await temporary.delete();
        throw new Error(cancellation.aborted ? 'Preparation cancelled.' : 'Could not download the assistant. Check your connection and try again. Your medicines and logs are still available.');
      }
    },
    removeTemporary: async uri => { const file = resolve(uri); if (file.exists && file.name.endsWith('.partial')) await file.delete(); },
    publish: async uri => {
      // Preserve any previous invalid file rather than silently overwriting it.
      if (canonical.exists) await canonical.move(new File(directory, `previous-model-${Date.now()}.gguf`));
      const file = new File(uri); await file.move(canonical); return file.uri;
    },
  }, signal, status);
}
