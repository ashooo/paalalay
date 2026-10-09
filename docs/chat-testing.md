# Development chat and conversation loop

Start `npx expo start --dev-client`, open the existing Android development build,
and select **Chat**. This route and tab are development-only. Chat history is held
in memory and disappears when the session unmounts or **New chat** is selected.
The model file remains separate from the app package.

## Native model test

### Explicit SQLite setup and save test

On Android, select **Set up database and connect tools** in Chat. This applies
the migration from `main` only on that explicit action, then switches the chat
to real SQLite handlers. It unloads the model; load it again after setup.
Startup, Reload, and New chat never apply migrations automatically.

Select **Save synthetic BP and verify persistence** to insert one labelled
120/80 test record and read it after closing and reopening the database. The
record remains saved, and its ID is displayed. Then test **BP 120/80 sample**:
**Confirm and save** writes a real `health_logs` row; cancellation writes none.
Medication listing reads real rows, while other tools remain unavailable.
Chat history is still held only in memory. Browser preview continues using mocks.

The save test uses the app's `paalalay.db`, rather than the README's desktop
SQLite command. For inspection, use Expo's SQLite DevTools inspector.

Verified on the Android x86_64 emulator with Qwen3-0.6B-Q8_0: native setup
recognized migration 1; the direct synthetic save survived closing and reopening
SQLite. The model selected `log_blood_pressure`, displayed a confirmation, and
after approval inserted exactly one row and explained the real returned log ID.
Cancellation left the row count unchanged. The successful prompt explicitly
supplied 120/80, pulse 60, and the synthetic timestamp `2023-10-05T12:00:00Z`.

Known model limitation: the short BP sample also proposed an unsupplied pulse
and historical timestamp. That proposal was cancelled. Schema validation checks
types and ranges, rather than proving values came from the user. Review all fields
and cancel invented values; this model has not passed the no-guessing criterion.
Empty `<think>` markers can also appear in its displayed final response despite
thinking being disabled. Chat tool selection remains model-dependent.

The GGUF in `assets/models/Qwen3-0.6B-Q8_0.gguf` must be copied onto the device
separately. For a connected device with a debuggable `com.paalalay.app` installed,
run these commands from the project root (they copy only the model file):

```powershell
adb push assets/models/Qwen3-0.6B-Q8_0.gguf /data/local/tmp/paalalay-model.gguf
adb shell run-as com.paalalay.app mkdir -p files/models
adb shell run-as com.paalalay.app cp /data/local/tmp/paalalay-model.gguf files/models/Qwen3-0.6B-Q8_0.gguf
```

Enter `file:///data/user/0/com.paalalay.app/files/models/Qwen3-0.6B-Q8_0.gguf`
in **Chat** and select **Load model**. The package ID and path must match the
actual installation. Expo Go and the browser cannot load the native model.
UI changes such as removing a tab need a Metro reload, not a native rebuild.

1. Send **List medications sample**. The model should choose `list_medications`,
   receive the synthetic empty list, and explain the result without confirmation.
2. Send **BP 120/80 sample**. The model should propose `log_blood_pressure` and the
   chat must pause at a review card showing both measured values and units.
3. Select **Confirm mock action**. A synthetic tool response appears, followed
   by a model-generated explanation. The assistant must identify this as a mock
   action, rather than claim a record was saved.
4. Repeat and select **Cancel action**. The handler must not run; the model gets
   the cancellation result and can only explain it, with tools disabled.
5. Send **Missing BP sample**. Expect a clarification rather than guessed values.
6. Select **Stop** during generation or review. A pending write is cancelled. An
   already executing handler cannot be undone; its actual result is retained.
7. **New chat** clears transcript memory while retaining the loaded model.
   **Unload model** releases the native context and clears that chat session.

Native tool selection depends on the GGUF and its chat template. The Android
device test is required before claiming this works with the installed model.
There is no cloud inference fallback. Only medication listing and blood-pressure
logging are advertised to the model, matching the connected mock handlers. The
full public registry remains available to the dispatcher; unavailable handlers
return `NOT_FOUND`. Tool-free explanations omit schemas to conserve context.
The native context is 8,192 tokens, shared with the controller's input budget;
256 tokens are reserved for each answer and 64 for a safety margin. Older complete
turns are trimmed when necessary, preserving the active request and tool exchange.
This chat does not connect to SQLite or persist health records.

## Browser UI verification

Run `npx expo start --web`, select **Chat**, and verify that native inference is
unavailable. Select **Use scripted UI preview** to exercise the actual controller
and confirmation UI with an explicitly labeled fake model. The preview recognizes
the three sample messages above; it is not a language model or an automatic
fallback. Confirm, cancel, missing inputs, immediate reads, reset, and disabled
controls can be checked without native modules. **Exit scripted preview** ends
and clears the preview session.

## Controller and runtime integration

`createAgentController(model, handlers)` receives a model implementing `generate`,
`countTokens`, and `stop`, plus the existing typed `ToolHandlers`. It exposes
`send`, `confirm`, `cancel`, `stop`, `reset`, `dispose`, `subscribe`, and
`getSnapshot`. The snapshot contains transcript entries, phase, completion count,
and an optional review card. Confirm/cancel are trusted UI operations only.

The native model adapter preserves tool-call IDs and forwards assistant proposals
and matching `tool` responses in the next completion. Missing or reused IDs get
unique session-local IDs. The runtime also supports single-prompt calls through
`complete` for adapter tests.

Each user message permits at most five completions, including resumed generation
after confirmation. The fifth is tool-free. Errors and cancellations allow only
one tool-free explanation. Multiple calls are rejected; repeated successful writes
with identical validated arguments cannot execute twice in the same user turn.
Failed writes never retry automatically.

Before inference the runtime counts the fully formatted prompt, including tool
schemas. Older complete turns are removed from the model input until it fits the
7872-token input budget (8192 context minus 256 output and 64 reserve). The system
prompt and current user/tool exchange are never truncated. Oversized active
requests stop before another tool executes. Trimming model input does not erase
the displayed transcript.

Run `npm run test:agent`, `npx tsc --noEmit`, and `npm run lint`. Controller tests
inject fake model outputs and services; adapter tests fake the native context.
They validate control flow, not actual model quality or Android inference.
