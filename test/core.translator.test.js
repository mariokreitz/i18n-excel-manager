import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OpenAIProvider } from '../src/core/translator.js';

class FakeCompletionClient {
  constructor(responder) {
    this.chat = {
      completions: {
        create: responder,
      },
    };
  }
}

const makeProviderWithResponder = (responder) => {
  const provider = new OpenAIProvider('fake-key', 'test-model');
  provider.client = new FakeCompletionClient(responder);
  return provider;
};

describe('OpenAIProvider translateBatch', () => {
  it('returns empty array for empty input', async () => {
    const provider = makeProviderWithResponder(async () => {
      throw new Error('should not be called');
    });
    const result = await provider.translateBatch([], 'en', 'de');
    assert.deepEqual(result, []);
  });

  it('translates via mocked completion response', async () => {
    const provider = makeProviderWithResponder(async () => ({
      choices: [
        { message: { content: JSON.stringify({ translations: ['Hallo'] }) } },
      ],
    }));

    const result = await provider.translateBatch(['Hello'], 'en', 'de');
    assert.deepEqual(result, ['Hallo']);
  });

  it('warns when translation count mismatches input length', async () => {
    const provider = makeProviderWithResponder(async () => ({
      choices: [
        { message: { content: JSON.stringify({ translations: ['A', 'B'] }) } },
      ],
    }));

    let warned = false;
    const origWarn = console.warn;
    console.warn = () => {
      warned = true;
    };
    try {
      const result = await provider.translateBatch(['only-one'], 'en', 'de');
      assert.deepEqual(result, ['A', 'B']);
      assert.ok(warned);
    } finally {
      console.warn = origWarn;
    }
  });

  it('throws a helpful error on invalid response format', async () => {
    const provider = makeProviderWithResponder(async () => ({
      choices: [{ message: { content: JSON.stringify({ wrong: [] }) } }],
    }));

    await assert.rejects(
      () => provider.translateBatch(['hello'], 'en', 'de'),
      /Invalid response format/,
    );
  });
});
