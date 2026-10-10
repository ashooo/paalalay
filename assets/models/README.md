# Local model storage

This ignored folder may hold the verified model for host-side development:

`assets/models/Qwen3-0.6B-Q8_0.gguf`

Model files are local development resources. This folder's contents (except this
README) and all `*.gguf` files are ignored by Git and explicitly excluded by
`.easignore` from cloud build uploads.

Do not import or `require()` the model as a bundled app asset. The model will be
downloaded automatically from the pinned official Qwen repository when Assistant
first opens, verified by size and SHA-256, and loaded from app-private storage.
An existing verified device file is reused. Copying a file here alone does not
make it available on the device. See `docs/setup.md` and `src/ai/model-asset.ts`.
