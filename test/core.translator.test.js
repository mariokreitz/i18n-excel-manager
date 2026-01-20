import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GeminiProvider } from '../src/core/translator.js';

class FakeGenAiClient {
  constructor(responder) {
    this.responder = responder;
  }

  get models() {
    return {
      generateContent: this.responder,
    };
  }
}

const makeProviderWithResponder = (responder) => {
  const provider = new GeminiProvider('fake-key', 'test-model');
  provider.client = new FakeGenAiClient(responder);
  return provider;
};

describe('GeminiProvider translateBatch', () => {
  it('returns empty array for empty input', async () => {
    const provider = makeProviderWithResponder(async () => {
      throw new Error('should not be called');
    });
    const result = await provider.translateBatch([], 'en', 'de');
    assert.deepEqual(result, []);
  });

  it('translates via mocked completion response', async () => {
    const provider = makeProviderWithResponder(async () => ({
      text: JSON.stringify({ translations: ['Hallo'] }),
    }));

    const result = await provider.translateBatch(['Hello'], 'en', 'de');
    assert.deepEqual(result, ['Hallo']);
  });

  it('warns when translation count mismatches input length', async () => {
    const provider = makeProviderWithResponder(async () => ({
      text: JSON.stringify({ translations: ['A', 'B'] }),
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
      text: JSON.stringify({ wrong: [] }),
    }));

    await assert.rejects(
      () => provider.translateBatch(['hello'], 'en', 'de'),
      /Invalid response format/,
    );
  });

  it('throws error when API returns empty response', async () => {
    const provider = makeProviderWithResponder(async () => ({
      text: null,
    }));

    await assert.rejects(
      () => provider.translateBatch(['hello'], 'en', 'de'),
      /Empty response from Gemini/,
    );
  });

  it('throws error when API returns undefined text', async () => {
    const provider = makeProviderWithResponder(async () => ({}));

    await assert.rejects(
      () => provider.translateBatch(['hello'], 'en', 'de'),
      /Empty response from Gemini/,
    );
  });

  it('wraps API errors with descriptive message', async () => {
    const provider = makeProviderWithResponder(async () => {
      throw new Error('Network timeout');
    });

    await assert.rejects(
      () => provider.translateBatch(['hello'], 'en', 'de'),
      /Gemini API Error: Network timeout/,
    );
  });

  it('handles JSON parse errors gracefully', async () => {
    const provider = makeProviderWithResponder(async () => ({
      text: 'not valid json{',
    }));

    await assert.rejects(
      () => provider.translateBatch(['hello'], 'en', 'de'),
      /Gemini API Error/,
    );
  });

  it('validates that translations is an array', async () => {
    const provider = makeProviderWithResponder(async () => ({
      text: JSON.stringify({ translations: 'not-an-array' }),
    }));

    await assert.rejects(
      () => provider.translateBatch(['hello'], 'en', 'de'),
      /Invalid response format.*expected "translations" array/,
    );
  });
});
