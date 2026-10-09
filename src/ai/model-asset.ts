export const MODEL_ASSET = {
  name: 'Qwen3-0.6B-Q8_0.gguf', bytes: 639446688,
  sha256: '9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031',
  url: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf',
};
export interface ModelAssetPort {
  existing: () => Promise<string[]>;
  size: (uri: string) => number;
  hash: (uri: string, signal: AbortSignal) => Promise<string>;
  download: (url: string, signal: AbortSignal, progress: (percent: number) => void) => Promise<string>;
  removeTemporary: (uri: string) => Promise<void>;
  publish: (uri: string) => Promise<string>;
}
export async function prepareModelAsset(port: ModelAssetPort, signal: AbortSignal, status: (text: string) => void) {
  const check = () => { if (signal.aborted) throw new Error('Preparation cancelled.'); };
  for (const uri of await port.existing()) {
    check();
    if (port.size(uri) !== MODEL_ASSET.bytes) continue;
    status('Checking the assistant on your phone…');
    if (await port.hash(uri, signal) === MODEL_ASSET.sha256) { check(); return uri; }
  }
  let temporary: string | undefined;
  try {
    check(); status('Downloading the offline assistant (639 MB). Keep the app open; Wi-Fi is recommended.');
    temporary = await port.download(MODEL_ASSET.url, signal, percent => status(`Downloading the offline assistant · ${percent}% of 639 MB`));
    check(); status('Verifying the assistant download…');
    if (port.size(temporary) !== MODEL_ASSET.bytes || await port.hash(temporary, signal) !== MODEL_ASSET.sha256) throw new Error('The assistant download could not be verified. Try again when connected.');
    check(); return await port.publish(temporary);
  } finally { if (temporary) await port.removeTemporary(temporary); }
}
