# Assistant and automatic startup

Start `npx expo start --dev-client`, open the existing native development build,
and use Metro **Reload**. These changes add no native module. A build predating
the merged OCR dependency still needs one native rebuild. The `/chat` route
redirects to **Assistant**. Expo Go and web cannot run the local model.

The app imports Lucide through `src/components/icons.ts`, which uses the package's
public per-icon exports. This avoids traversing the full icon catalog, which caused
recurring Windows Metro resolution errors for unrelated icons even when their files
were present. If an older server still reports the catalog entry file, stop it and
restart with `npx expo start --dev-client --port 8087 --clear`, then use Reload.
No native rebuild or database change is required for this JavaScript import fix.

## First launch

Native startup creates an empty baseline SQLite database **only if the database
file does not exist**, under the user's explicit fresh-install approval. It never
seeds records. Existing files are opened and checked; missing columns, missing
migrations and unknown schema versions report an error without repair, reset or
migration. Future upgrades need separate approval. Desktop web databases are not
automatically created. Do not delete an existing database to bypass an error.

Opening Assistant checks the managed or legacy model in the app's documents/models
directory. A valid existing Qwen3-0.6B-Q8_0 file is reused. Otherwise the app downloads
639,446,688 bytes from the official Qwen repository, verifies its size and SHA-256,
then loads it automatically. There are no model URI/load controls or database setup
buttons. Keep the app open and use Wi-Fi for the initial download; reserve at least
800 MB of free phone storage. Subsequent inference works offline. Failed downloads
offer Retry while Medicines and Log remain usable. Unmount aborts preparation and
releases the model safely. There is no cloud inference fallback.

The pinned revision, URL and checksum are in `src/ai/model-asset.ts`. The official
[Qwen model repository](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF) publishes it
under Apache-2.0. GGUF files remain excluded from Git and build uploads.

## Chat behavior

All public tools use real handlers. Reads execute immediately; record/schedule
writes require review and **Confirm and save**. Reminder times saved by chat do
not establish notification delivery: enable phone alerts in Medicines and grant
the OS notification permission. Online medicine reference lookup requires a
successful local lookup and separate permission for each NHS request. Chat and
saved records are not sent to NHS.

Each user turn permits five model completions. Multiple calls are rejected;
invalid arguments, cancellations and service failures get one tool-free explanation.
Successful identical writes are not repeated during the same turn. Stop cancels
a pending review; an executing handler cannot be undone. New chat clears the
in-memory transcript; it keeps medical records and approved saved memories.
Conversation is not persisted. Thinking is disabled, reasoning
markers are removed, and responses appear when each completion finishes rather
than token streaming. Context is 8,192 tokens; output reserves 512 tokens.

Numeric measurement arguments must appear in the current message; glucose,
temperature and weight units must be explicit. This guard catches invented
numbers and guessed units, but does not prove semantic correctness or validate
medicine instructions against a prescription. Review every proposed field.
The model does not prescribe, change doses or infer a catch-up schedule.

## Saved memories and activity

The assistant has 19 public tools, including `list_memories`, `remember_memory`
and `forget_memory`. An explicit request to remember a lasting preference produces
a review before saving. Forget reviews include the exact saved text and refuse a
stale deletion if it changed. Manage memories opens a screen for viewing, editing
and confirming removal. The approved separate `assistant-memory.db` is created
only when absent; existing memory files are checked without repair. There is no
web substitute, sample memory or automatic conversation archive.

Up to 40 memories can be stored, each at most 300 characters. The latest 12 enter
each completion as untrusted context within the existing token budget. They cannot
authorize tool writes or establish prescription facts. Forgetting changes future
context; start a new chat to remove text already present in the current transcript.
The prompt discourages inferred medical facts and secrets, but users must still
review every proposed memory.

Animated dots identify actual model preparation, generation and tool execution.
They stop during confirmation and honor the OS reduced-motion preference. They do
not imply token streaming or expose private reasoning. Medicine and log entry
fields open in sheets after Add, the dashboard logging action or a reviewed OCR
handoff; overview screens show saved records, summaries or actionable empty states.

## Verification

`npm run test:agent`, `npm run lint` and `npx tsc --noEmit` validate the controller,
dispatcher, real handler mapping, grounding, model verification and first-install
behavior. SQLite tests use separate temporary synthetic databases under the user's
test approval; they do not access the existing app database. Android JavaScript
export checks Hermes bundling, not native model performance or notification delivery.

On a native development build, verify these before release:

1. Reuse the existing verified model without downloading. Separately test a fresh
   installation, initial download progress, cancellation, Retry, offline failure
   and insufficient storage. Do not uninstall a data-bearing app for this test.
2. Ask an ordinary question and list medicines. No read confirmation should appear.
3. Give an explicitly synthetic BP reading, review its exact fields and confirm
   only in an approved synthetic test environment. Verify one saved record after
   reload, then test cancellation and Stop without any additional save.
4. Ask to record BP without values and glucose without units. Expect clarification.
5. Test medicine creation, schedule review, intake recording and history. Verify
   permission denial, enabled notifications and delivery on the target device.
6. Test local medicine lookup followed by NHS consent, denial, offline failure and
   a clickable source. Check model wording against the source and exact leaflet.
7. Navigate away during preparation/generation, return, and reset a conversation.
   Check cleanup, keyboard layout, long reviews, dark mode and screen-reader labels.
8. Ask to remember a reply preference. Cancel first, then confirm a second request;
   verify only the confirmed memory survives a new chat and app restart. Edit and
   forget it in Memories, and verify future context reflects those changes.

Browser verification covers Home, saved insights and Assistant's native requirement;
it cannot establish native inference or confirmation-card behavior with a real GGUF.
See `production-readiness.md` for remaining release checks.
