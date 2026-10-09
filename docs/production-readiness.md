# Production cleanup and release checks

Development was fast-forwarded to `0f25fa4` (the accepted Dev3 PR) before these
changes. Home now shows today's saved reminders, recent readings, logging/scanning
actions and links to Assistant, Insights and nearby care. Empty and failure states
are distinct. Insights reads real platform data, uses seven UTC calendar dates,
keeps glucose units in separate charts and labels intake percentages as proportions
of recorded events, not proof of adherence to all scheduled doses. Quick logging
uses validated handlers and blocks simultaneous submissions.

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

All 60 agent/integration tests, Expo lint and TypeScript checking pass. Web export
includes 10 routes and 17 API handlers; Android Hermes export passes. GGUF exclusion
was checked. Browser checks at desktop and 390-dp phone width covered Home,
Insights, the native-only Assistant state and glucose quick logging. An invalid
`90junk` value was rejected; a valid synthetic `90 mg/dL` save produced exactly one
new row with unknown meal context in the approved temporary test database. Existing
app databases were not changed. The current automatic native download/inference
flow still needs the device checks listed above.
