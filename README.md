# Paalalay

**Private AI assistance for everyday health, running on your phone.**

Paalalay helps Filipino patients keep track of prescribed medicines, reminders,
intake history and health readings. A compact Qwen language model interprets
conversation; validated tools retrieve records and save user-approved actions.
After the initial model download, core chat and recordkeeping work offline without
cloud language-model inference.

## Features

- A dashboard with today's reminders, recent readings and summaries.
- Medicine management, user-selected reminder times, and taken/skipped history.
- Blood pressure, glucose, temperature, weight and symptom logging with charts.
- Chat backed by 19 tools: reads run immediately; writes require confirmation.
- Approved assistant memories, with edit and forget controls.
- Bundled native OCR for reviewing typed prescription text before saving.
- A local medicine-name catalog with 659 reference entries and typo suggestions.
- Optional NHS medicine-reference lookup after explicit consent, and nearby-care
  searches through Google Maps.

Paalalay does not diagnose, prescribe, select a dose, or automatically recalculate
a schedule after a missed dose. Confirm every extracted value and prescription
instruction. Medicine-name suggestions are not dosing guidance.

## Install the Android APK

Download the completed **production** APK from the EAS build link provided by the
maintainer. This build includes its JavaScript and works without Metro. Allow
installation from your browser/file manager when Android requests it.

Existing installations must have a compatible signing certificate to update in
place. A locally debug-signed development app may reject an EAS-signed APK. Do not
uninstall a data-bearing app to resolve that error: uninstalling removes its local
records. Test on a separate device or arrange a compatible build instead.

On first use:

1. Open the app. A fresh install creates an empty local database automatically.
2. Open **Assistant** while connected. It downloads the pinned Qwen3-0.6B Q8_0
   model (639,446,688 bytes), verifies its SHA-256, and loads it automatically.
   Keep the app open; Wi-Fi is recommended. Reserve at least 800 MB of free storage
   for the model and allow additional space for the installed app.
3. Once preparation finishes, core chat works offline. A verified existing model
   is reused. The model is not embedded in the APK.
4. Add a medicine from your prescription, choose prescribed reminder times, and
   enable phone alerts in Medicines. Camera, location and notification permissions
   are requested for their corresponding features.

Existing databases are opened and checked, never reset, seeded or migrated during
startup. Schema mismatches report an error. There is no setup/reset database button.

## Development setup

This project uses npm, Expo SDK 57, React Native 0.86 and TypeScript. Expo requires
Node.js 22.13 or newer; the current checks were run with Node.js 24.21.0.

```sh
git clone https://github.com/ashooo/paalalay.git
cd paalalay
git switch development
npm ci
npx expo start --dev-client --port 8087
```

Open an installed native development build. Expo Go cannot run the custom local
model/OCR modules. JavaScript-only changes use **Reload**; native dependency or
config changes require a new development build.

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```

Web is a UI/API preview, not the local-AI demo:

```sh
npx expo start --web --port 8087
```

Web API routes require an existing compatible SQLite file. Set `PAALALAY_DB_PATH`
to its absolute path when needed. Web startup never creates or seeds a database.
Any database setup, migration or test-data operation requires explicit approval;
do not run SQL from an old starter README or reset a database to bypass an error.

See [the setup and packaging guide](docs/setup.md) for build commands and
troubleshooting, and [chat testing](docs/chat-testing.md) for the demo procedure.

## Package a standalone APK

```sh
npm run lint
npm run typecheck
npm run test:agent
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile production
```

The SQLite tests create and modify **temporary synthetic databases**. Run them
only with the project owner's explicit permission. They do not use the app's saved
database. Build and lint commands do not initialize databases.

On first EAS use, select the intended Expo account/project and configure Android
signing. Preserve the signing credentials for future updates. `production` and
`preview` produce standalone APKs; `development` includes the development client.
APK creation does not publish to Google Play or upload a demo video.

The source upload excludes GGUF files, local databases, signing files, tests and
development artifacts. Android automatic cloud backup is disabled. Generated
`android/` and `ios/` directories are excluded; cloud builds use app configuration
and config plugins.

## Privacy and architecture

The native app uses `llama.rn` for CPU inference, SQLite for records, and an
independent `assistant-memory.db` for approved preferences. The model has an 8,192
token context and a 512-token output limit. Conversations stay in memory; new chat
does not erase records or saved memories. Responses appear after each completion,
with animated activity feedback rather than token streaming.

The controller validates tool arguments/results, rejects multiple proposed calls,
limits each turn to five completions, and prevents identical successful writes
from repeating within a turn. Failed or cancelled writes are not retried
automatically. These guards do not constitute clinical validation.

Local SQLite is not encrypted by the application. Device security still matters.
An approved NHS lookup sends medicine-page requests and the device IP address;
nearby-care searches disclose the search location to Maps. Neither requires cloud
LLM inference. There is no automatic chat archive or account-based cloud sync.

## Verification and disclosures

64 automated tests cover the controller, dispatcher, storage and tool behavior.
Lint, typecheck, web bundling and Android Hermes compilation have passed. Native
inference, OCR and notification delivery must also be tested on target phones;
JavaScript compilation alone is not a native release certification. Broad device
compatibility is a design goal, not a benchmarked guarantee.

- Model: official [Qwen3-0.6B GGUF](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF),
  Q8_0; revision and checksum are pinned in `src/ai/model-asset.ts`.
- OCR: Google ML Kit through `rn-mlkit-ocr`, with the Latin model bundled.
- Reference data: user-supplied PNF EML 2022 medicine-name CSV; see
  [reference notes](src/features/medicines/reference/README.md).
- Foundation: Expo starter, open-source libraries, Manrope fonts and Expo icons.
- AI development assistance: OpenAI Codex; contributors should disclose any
  additional tools they used.

See [production readiness](docs/production-readiness.md) for remaining device and
release checks. Preserve dependency and model license notices; project terms are
in [LICENSE](LICENSE).
