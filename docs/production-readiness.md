# Production cleanup and release checks

Development was fast-forwarded to `0f25fa4` (the accepted Dev3 PR) before these
changes. Home now shows today's saved reminders, recent readings, logging/scanning
actions and links to Assistant, Insights and nearby care. Empty and failure states
are distinct. Insights reads real platform data, uses seven UTC calendar dates,
keeps glucose units in separate charts and labels intake percentages as proportions
of recorded events, not proof of adherence to all scheduled doses. Quick logging
uses validated handlers and blocks simultaneous submissions.

The follow-up adds a time-of-day welcome, active-medicine/reminder/weekly-reading
counts and suggested chat drafts. Medicine and log forms open only after an Add
action or handoff. Both overviews distinguish an empty collection from a load
failure. Approved persistent preferences have their own Memories screen and local
database; chat saves and forgets require confirmation. Activity dots follow real
operations and respect reduced motion.

Mock handlers, synthetic examples and the manual test database helper now live only
under `tests/fixtures`. Product doctor seeds and the scripted chat preview were
removed. Directory queries hide rows without an HTTPS source and a valid past
verification date, including known example-domain rows; stored rows are preserved.
This provenance filter does not independently verify licenses or source accuracy.

Assistant uses real tool handlers and automatic verified model preparation. Native
database startup follows the approved fresh-file-only baseline policy. Existing
records and migration history are never rewritten during startup. See
`chat-testing.md` for behavior and device checks.

## Release gates

Automated tests, lint, typecheck and JavaScript export are necessary but do not
constitute native release certification. Verify initial model download/loading,
actual inference and confirmation/resumption on Android, native OCR offline,
notification permissions/delivery, accessibility and app background/resume behavior.
This cleanup does not build, sign, upload or publish an APK. No EAS project or
signing configuration is silently created.

Packaging is explicitly on hold at the user's request. `eas.json` prepares native
development and standalone APK profiles for later. `.easignore` excludes local
SQLite files, model binaries, tests and development artifacts. EAS authentication
is currently unavailable (`whoami`: not logged in); no cloud build was started.

`expo-doctor` currently passes 20/21 checks and reports `rn-mlkit-ocr` as untested
on the New Architecture. Verify that module on the actual SDK 57 native build.
The verified specialist directory needs authoritative records and provenance;
empty installations use nearby-care Maps as the default entry point. Do not seed
invented doctors to hide an empty state.

The dependency audit at cleanup reported 29 affected packages (18 high, 11 moderate,
0 critical), including transitive parents. Root advisories involve:

- [braces recursion exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm):
  Metro file-matching tooling; the advisory lists no patched version.
- [node-forge signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv):
  Expo CLI/code-signing tooling. Review compatible upstream fixes before release.
- [decode-uri-component malformed-input decoding](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr):
  Expo Router's query-string dependency; review runtime exposure and compatible fixes.
- [uuid buffer bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq):
  the Xcode config-plugin dependency; review the affected calls in build tooling.

Do not apply `npm audit fix --force`: the current suggested changes include an Expo
44 downgrade and an incompatible Router major. Track compatible upstream updates,
assess reachable code paths and rerun checks before calling a release ready.

The current implementation uses local SQLite without app-level encryption. Device
access controls and a tested data-protection/backup policy remain release decisions
for health records. No telemetry or cloud chat fallback was added by this cleanup.

## Verification recorded for this cleanup

The earlier cleanup passed 60 agent/integration tests. Its Web export
includes 10 routes and 17 API handlers; Android Hermes export passes. GGUF exclusion
was checked. Browser checks at desktop and 390-dp phone width covered Home,
Insights, the native-only Assistant state and glucose quick logging. An invalid
`90junk` value was rejected; a valid synthetic `90 mg/dL` save produced exactly one
new row with unknown meal context in the approved temporary test database. Existing
app databases were not changed. The current automatic native download/inference
flow still needs the device checks listed above.

The follow-up passes all 64 tests, Expo lint and TypeScript checking. Added tests
cover approved memory confirmation, cancellation, stale forgetting, concurrent
deduplication, bounded context, reopening a persisted memory file and refusal to
repair existing incompatible storage. Browser verification uses a separate empty
temporary test database and checks the dashboard, medicine/log empty states, Add
sheets, cancellation and repeated dashboard logging actions at phone width.
No existing app database was changed. The Android emulator is connected and has
the GGUF file, but native UI automation is unavailable and a read-only package
inspection returned a binder error. Real native inference/OCR/notification checks
are still pending; no APK was built or packaged in this follow-up.
