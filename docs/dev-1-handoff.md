# Dev 1 agent foundation

The first implementation provides the 14 public tool contracts, model-facing JSON
schemas, and a confirmation dispatcher. It does not load a model, render chat,
open SQLite, persist transcripts, or register production feature handlers yet.

## Feature handler integration

Devs 2 and 3 provide functions satisfying `ToolHandlers` in
`src/contracts/tools.ts`. Inputs use the frozen snake_case parameter names.
Handlers return `{ status: 'success', data: ... }` or
`{ status: 'error', error: { code, message } }`. Both inputs and service outputs
are validated at the dispatcher boundary. Services still perform their own
business validation for manual-screen callers.

```ts
import { createToolDispatcher } from '../src/ai/dispatcher';
import type { ToolHandlers } from '../src/contracts/tools';

const handlers: ToolHandlers = {
  // list_medications: medicationService.listMedications,
  // log_blood_pressure: healthService.logBloodPressure,
};
const dispatcher = createToolDispatcher(handlers);
const outcome = await dispatcher.propose('log_blood_pressure', {
  systolic: 120,
  diastolic: 80,
});
// A connected write returns kind: 'confirmation'. Render every review field.
// Only an explicit user tap should call dispatcher.confirm(outcome.review.id).
// Cancel calls dispatcher.cancel(outcome.review.id); it never invokes a handler.
```

Use one dispatcher instance per chat. A pending review blocks subsequent
proposals; cancel it before changing arguments or abandoning a chat. Confirmations
are single-use, including when a handler fails. Read tools execute immediately.
The review contains a snapshot of all supplied arguments with units and UTC/local
time labels. Review IDs and confirm/cancel methods must never enter the model tool
registry. All human-readable defaults that a feature service adds (for example,
schedule dates or device timezone) should also be shown by its final review UI.

`getModelTools()` provides the function definitions for the local model. Only
schema-valid arguments can reach handlers. Validation errors request clarification;
the future agent loop must never fill missing medicine strengths or times by
guessing. Schema validation cannot prove that a model's values were supplied by
the user, so the chat integration must preserve that distinction and show the
review before every write. Internal OCR is intentionally absent.

## Development verification

`src/ai/mock-handlers.ts` provides synthetic list-medication and blood-pressure
responses. It is not registered in the application. Mock success does not mean
data was saved. Unconnected handlers return `NOT_FOUND`.

Run `npm run test:agent`, `npx tsc --noEmit`, and `npx expo lint`.
The tests use the existing TypeScript dependency and do not connect to a database.

## Next milestone

Build the chat screen and confirmation card, then connect a local Qwen3 GGUF via
the installed llama.rn version. Keep model loading failures independent of manual
feature screens. Verify the native runtime and model on Android before claiming
offline inference works. Coordinate native configuration with Dev 4 and real
handlers with Devs 2 and 3. Chat persistence can wait for Dev 4's database interface
and explicit permission for any database-affecting operation.
