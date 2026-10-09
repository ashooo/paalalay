# Local model storage

Place your Qwen3 GGUF model in this folder, for example:

`assets/models/Qwen3-1.7B-Q4_K_M.gguf`

Model files are local development resources. This folder's contents (except this
README) and all `*.gguf` files are ignored by Git. EAS uses `.gitignore` for build
uploads because this project has no `.easignore` file.

Do not import or `require()` the model as a bundled app asset. The model will be
provisioned separately onto the device and loaded from an app-accessible local
file path when the model loader is implemented. Copying a file here alone does
not make it available on the device.
