const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const { createLocalModelRuntime } = require('../src/ai/local-model.ts');
const { MODEL_CONTEXT_TOKENS, MODEL_INPUT_TOKENS, MODEL_OUTPUT_TOKENS } = require('../src/ai/model-config.ts');

test('native runtime budgets and generates with identical connected-tool schemas, omitting them when disabled', async () => {
  const formats = [];
  const completions = [];
  let allocation;
  let released = false;
  const context = {
    getFormattedChat: async (messages, template, options) => {
      formats.push(options);
      return { prompt: JSON.stringify({ messages, options }) };
    },
    tokenize: async () => ({ tokens: [1, 2, 3] }),
    completion: async (options) => {
      completions.push(options);
      return { content: 'Hello', tool_calls: [] };
    },
    release: async () => { released = true; },
  };
  const original = Module._load;
  Module._load = function (name, ...args) {
    if (name === 'llama.rn') return { initLlama: async (options) => { allocation = options; return context; } };
    return original.call(this, name, ...args);
  };
  const runtime = createLocalModelRuntime(['list_medications', 'log_blood_pressure']);
  try {
    await runtime.load('file:///models/test.gguf');
    const messages = [{ role: 'user', content: 'My BP is 120/100' }];
    for (const enabled of [true, false]) {
      assert.equal(await runtime.countTokens(messages, enabled), 3);
      await runtime.generate(messages, enabled);
    }
    assert.equal(allocation.n_ctx, 8192);
    assert.equal(MODEL_INPUT_TOKENS + MODEL_OUTPUT_TOKENS + 64, MODEL_CONTEXT_TOKENS);
    assert.deepEqual(formats[0].tools.map((tool) => tool.function.name), ['list_medications', 'log_blood_pressure']);
    for (let i = 0; i < 2; i++) {
      assert.deepEqual(completions[i].tools, formats[i].tools);
      assert.equal(completions[i].tool_choice, formats[i].tool_choice);
      assert.equal(completions[i].enable_thinking, false);
    }
    assert.equal(formats[1].tools, undefined);
    assert.equal(formats[1].tool_choice, 'none');
  } finally {
    Module._load = original;
    await runtime.dispose();
  }
  assert.equal(released, true);
});
