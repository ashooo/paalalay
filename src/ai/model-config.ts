// Shared by native allocation and the controller's prompt budget.
export const MODEL_CONTEXT_TOKENS = 8192;
export const MODEL_OUTPUT_TOKENS = 512;
export const MODEL_INPUT_TOKENS = MODEL_CONTEXT_TOKENS - MODEL_OUTPUT_TOKENS - 64;
