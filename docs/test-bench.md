# Temporary development test bench

Start the existing app with `npx expo start --dev-client`, then select **Test bench**
in the tab bar. For browser-only tool testing, run `npx expo start --web` and select
the same tab. The screen is available only in development mode; the release route
renders no test controls.

## Tool checks

- Select `list_medications`, then **Run tool**: receive a synthetic empty list immediately.
- Select `log_blood_pressure`, then **Run tool**: see a review card before execution.
- **Cancel**: receive `CANCELLED` with no handler execution.
- Run again and **Confirm mock action**: receive a synthetic success response.
- Choose **Invalid BP sample**, then **Run tool**: receive `VALIDATION_ERROR` requesting clarification.
- Enter `extract_prescription_text` as the tool name: receive `PERMISSION_DENIED`.
- Select another public tool: valid arguments return `NOT_FOUND` until its handler is connected.
- **Show schema** displays the exact model-facing JSON Schema for the selected tool.

This bench registers only mock list-medication and blood-pressure handlers. It
does not connect to SQLite, send network requests, or save health records. The
other tools have sample arguments for schema testing. These are local service
contracts, rather than HTTP endpoints.

## Native model checks

The development file currently placed in the project is
`assets/models/Qwen3-0.6B-Q8_0.gguf`. It is not imported as an asset or included in
the package. Android must receive a separate copy. A debug build with package ID
`com.paalalay.app` can use the following commands from the project root once a
device is connected (they copy only the model file):

```powershell
adb push assets/models/Qwen3-0.6B-Q8_0.gguf /data/local/tmp/paalalay-model.gguf
adb shell run-as com.paalalay.app mkdir -p files/models
adb shell run-as com.paalalay.app cp /data/local/tmp/paalalay-model.gguf files/models/Qwen3-0.6B-Q8_0.gguf
```

The example URI in the screen is
`file:///data/user/0/com.paalalay.app/files/models/Qwen3-0.6B-Q8_0.gguf`.
Adjust it for the actual installation and device storage path. `run-as` requires
a debuggable app; paths and package IDs must match the installed build.

Select **Load model**, then **Generate text** for a basic inference probe or
**Propose tool** to supply the public registry. Native inference needs a development
build containing llama.rn; Expo Go and the web cannot run this panel. Model loading
is lazy, so missing native inference does not prevent mock tool testing.

If exactly one tool call is returned, **Copy proposal to tool panel** copies its
name and JSON without executing it. **Run tool** performs validation and opens
the review card for writes. Model output alone never calls a feature handler.
Missing or invalid values must be clarified. Unload releases the model context;
unmounting the screen also schedules cleanup after an in-flight operation.

This is a single-prompt diagnostic, not a complete conversational agent. It does
not feed tool results into a follow-up model turn or persist chat history. Actual
model loading and tool selection must be verified on Android; automated adapter
tests use a fake native context.
