# Development branch integration — 10 October 2026

Follow-up: the user chose location-based hospital/clinic search instead of
maintaining verified doctor records. The Care tab now opens Google Maps with an
explicit location-sharing action or a manually entered city. See `nearby-care.md`.
The branch review below records the original contributions before that change.

The three contributor branches are integrated into `development`. This is a
working integration foundation, not a claim that every assigned task is complete.
`main` was not changed by this integration.

## Reviewed contributions

| Branch / reviewed head | Present and checked | Still incomplete or unverified |
| --- | --- | --- |
| `feat/apis` / `faf03d4` | Medication CRUD, schedules/intakes, five health log types, history/summary and doctor HTTP endpoints; native SQLite client | Android notification scheduling is not connected; local-day/timezone boundaries and adherence calculations need review; duplicate standalone server needs equivalent contract coverage |
| `feat/dev3` / `08fb655` | Actual doctor repository/service and search screen; specialty/city filtering and input validation | No completed dashboard charts; no verified provider dataset. Placeholder records are synthetic and unverified |
| `feat/dev-4` / `f18721d` | Screen structure/theme, baseline migration modules, local ML Kit adapter and editable prescription handoff | Native OCR recognition, bundled offline model behavior, airplane-mode test and APK delivery were not verified in this integration |

The old main template UI was replaced with the contributor UI and `design.md`
tokens: Manrope fonts, Linaw colors, rounded controls and five tabs — Home,
Medicines, Log, Assistant, Doctors. Assistant uses the existing working local
agent controller; Doctors uses Dev 3's search screen. The health form's previously
inactive save control now calls the shared health service. Insights reads recent
saved measurements, but it does not yet implement the assigned trend charts.
Accessibility, font scaling, reduced motion and final branded assets still need
device review.

## Integration corrections

- Kept Zod 4 and the existing `llama.rn` runtime/controller, tool parser and
  confirmation flow. Only medication listing and blood-pressure recording are
  connected to chat. Other tools return unavailable; they do not fabricate results.
- Replaced the static assistant preview with the actual agent screen. Web has an
  explicitly scripted UI preview; real model inference requires a native build.
- Validated write endpoint arguments against the shared tool contracts and fixed
  the manual health form's glucose/temperature/weight/symptom payload translation.
- Preserved intake IDs on upsert. Replacing schedules disables previous schedules
  and retains intake history; replacement is transactional. Notification counts
  truthfully report zero until a scheduler is connected.
- Removed automatic database creation, migrations and doctor seeding from normal
  startup/read paths. A missing or incompatible database reports that explicit
  setup is required. Web no longer pretends to have a successful SQLite database.
- Retained baseline migration 1. The API branch's automatic synthetic doctor seed
  migration is excluded from the development migration registry. Existing database
  migration history was not edited or reset. Synthetic provider fixtures have no
  verification claims and are not automatically inserted.
- Kept Android application ID `com.paalalay.app`, avoiding an accidental switch
  away from the existing installation's database and model location.
- GGUF files remain ignored and are not packaged or committed.

## Verification and limits

`npm run test:agent`: 38 tests pass. These cover the agent loop, confirmation,
cancellation, malformed/multiple calls, duplicate writes, failures, context and
turn limits, cleanup and database persistence. Added integration checks exercise
the actual Expo write/read endpoints against a newly created temporary SQLite
database containing only synthetic data, including all five log types, schedule
rollback/history preservation, intake IDs and read paths that never seed. Actual
Dev 3 service filtering and the OCR adapter/review handoff are also tested. OCR
native responses are injected; this is not proof of device recognition.

The user explicitly approved these temporary database tests. The existing app and
desktop databases were not migrated, seeded, reset or written by this integration.
App startup and reload use existing data as-is. Any future database setup or
data-changing verification requires the user's explicit approval.

Typecheck, Expo lint, web export (including 16 API routes) and Android JavaScript
export pass. Browser checks cover the five-tab navigation, working Assistant
review/confirmation/cancellation and Doctors required-specialty validation.
Android export verifies bundling, not a native build, GGUF inference or OCR.

## Running the integrated app

Use `npx expo start --dev-client` and open the development build. New OCR native
dependencies require one new development build; subsequent JavaScript/UI changes
can use Metro Reload. This repository does not yet have an `eas.json`; configure
the EAS development profile before requesting a cloud build.

Select **Assistant** for chat/model controls. The old `/chat` URL redirects there.
Existing native database setup remains an explicit action on that screen. Do not
run setup or the persistent synthetic save test without database approval. See
`chat-testing.md` for model placement and chat test details.

Before calling the project complete: connect/test native reminders, finish the
dashboard/charts, supply verified directory records, connect the remaining chat
handlers, verify the OCR native build offline, and run the Android accessibility
and end-to-end checks. The standalone `scripts/server.mjs` is a legacy duplicate;
the Expo API routes are the tested HTTP implementation.
