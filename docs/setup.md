# Setup, installation and Android packaging

## Native development

Install dependencies using `npm ci`, then run:

```sh
npx expo start --dev-client --port 8087
```

Use the existing native development build and its Reload action for JavaScript
changes. The app uses custom native `llama.rn` and ML Kit modules, so Expo Go is
insufficient. When native configuration/dependencies change, use EAS:

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile development
```

Install the resulting development APK on a suitable test device and reconnect it
to Metro. Do not uninstall an existing app containing needed records.

## Automatic app setup

Native fresh installs create only the empty baseline database. Existing files are
checked without migrations, repair, reset or seeding. Assistant memories use a
separate approved local file. Any future schema migration requires approval.

Opening Assistant provisions the pinned official Qwen3-0.6B Q8_0 model, checks size
and SHA-256, and loads it. A verified file already in the managed or legacy app
model directory is reused. Keep the app open for initial download and reserve
storage beyond the 639 MB model. Failed setup offers Retry. The health screens
remain available if model preparation fails.

`assets/models/` is an ignored host development folder, not an APK asset directory.
Putting a GGUF there does not copy it to a phone. No model URI entry or database
setup step is required by end users.

## Standalone Android APK

After the approved checks pass:

```sh
npx eas-cli@latest whoami
npx eas-cli@latest build --platform android --profile production
```

If not signed in, run `npx eas-cli@latest login` yourself. Never paste passwords,
access tokens or keystore contents into chat or source control. The first build
may require Expo project linking and Android signing credential creation. Choose
the intended account; EAS-managed credentials may be used and must be retained
for future updates.

The production profile requests an internally distributed, signed release APK
with embedded JavaScript. It does not require Metro, and it is not an AAB or a
Play Store submission. `preview` is another standalone APK profile; `development`
includes the development client.

Build status and APK download are provided by EAS. Check build history with:

```sh
npx eas-cli@latest build:list --platform android
```

Save downloaded APKs under ignored `artifacts/`. Release files must not enter
later source uploads. `.easignore` excludes models, local SQLite data, tests,
generated native directories, local environment files and signing artifacts.

Before distribution, inspect the APK manifest/package/version and confirm that
GGUF and local database files are absent. Verify signature integrity and keep the
SHA-256 of the distributed file. A successful cloud build is not proof that native
inference, OCR or reminders work on every device.

## Installing without losing records

An update must have the same Android package and signing identity as the installed
app. The package is `com.paalalay.app`, version 1.0.0, Android version code 1.
Increment the version code for future releases. Local debug and EAS release
signatures may differ, causing an installation conflict. Do not uninstall or clear
storage to make an update succeed; use a separate test device or a build signed
with the compatible identity. Android automatic cloud backup is disabled; no
in-app export/restore workflow is currently implemented.

## Checks

```sh
npm run lint
npm run typecheck
npm run test:agent
npx expo-doctor
```

`test:agent` creates/modifies temporary synthetic SQLite files. It needs explicit
database-test approval; existing app databases are untouched. Native app startup
on a data-bearing installation must not apply migrations automatically.

For release behavior, test initial model preparation, ordinary offline chat, a
confirmed synthetic reading on a test installation, cancellation, record
persistence, approved memories, typed prescription OCR and notification delivery.
Use a separate test installation for test writes. See `chat-testing.md`.

## Troubleshooting

- **Old Lucide module errors:** Lucide has been removed. Stop the old Metro process,
  restart with `npx expo start --dev-client --port 8087 --clear`, then Reload.
- **Missing native module:** use a development APK containing the current native
  dependencies. Clearing Metro cannot add a native module to an installed APK.
- **Model preparation failure:** check storage/connectivity and Retry. Do not
  delete medical databases. Model files are independently verified.
- **Schema mismatch:** report the error and seek explicit migration approval.
  Never reset, seed, replace or repair existing storage automatically.
- **Web storage errors:** native storage is not available in the browser. Web APIs
  need an existing compatible database selected by `PAALALAY_DB_PATH`; no automatic
  web database initialization is performed.
- **No reminder alert:** grant OS notification permission and enable/refresh phone
  reminders in Medicines. Device settings and battery restrictions affect delivery.
