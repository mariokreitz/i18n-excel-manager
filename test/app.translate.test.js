import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { translateApp } from '../src/app/translate.js';

class MockProvider {
  async translateBatch(texts, s, t) {
    return texts.map((txt) => `[${t}] ${txt}`);
  }
}

function captureConsole() {
  const origLog = console.log;
  const origWarn = console.warn;
  let out = '';
  let warn = '';
  console.log = (msg = '', ...rest) => {
    out += String(msg) + (rest.length > 0 ? ' ' + rest.join(' ') : '') + '\n';
  };
  console.warn = (msg = '', ...rest) => {
    warn += String(msg) + (rest.length > 0 ? ' ' + rest.join(' ') : '') + '\n';
  };
  return {
    get out() {
      return out;
    },
    get warn() {
      return warn;
    },
    restore() {
      console.log = origLog;
      console.warn = origWarn;
    },
  };
}

describe('app/translate', () => {
  it('translateApp: fills missing cells', async () => {
    // Mock Excel Structure
    const workbookMock = {
      worksheets: [
        {
          getRow: (n) => ({
            eachCell: (cb) => {
              if (n === 1) {
                cb({ value: 'key' }, 1);
                cb({ value: 'en' }, 2);
                cb({ value: 'de' }, 3);
              }
            },
            getCell: () => ({ value: null }), // stub
          }),
          eachRow: (cb) => {
            // Row 2 Data: key, Hello, ''
            const row2 = {
              getCell: (c) => {
                if (c === 2) return { value: 'Hello' };
                if (c === 3) {
                  return {
                    value: '',
                  };
                }
                return { value: 'k' };
              },
            };
            cb(row2, 2);
          },
        },
      ],
    };

    const io = {
      Excel: {
        Workbook: class {
          constructor() {
            return workbookMock;
          }
        },
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    const provider = new MockProvider();

    await translateApp(io, { input: 'dummy', apiKey: 'sk-test' }, { provider });
  });

  it('translateApp: throws when API key is missing', async () => {
    const io = {
      Excel: {
        Workbook: class {},
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    await assert.rejects(
      () => translateApp(io, { input: 'test.xlsx', sourceLang: 'en' }),
      /API Key is required/,
    );
  });

  it('translateApp: throws when input is empty', async () => {
    const io = {
      Excel: {
        Workbook: class {},
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    await assert.rejects(
      () => translateApp(io, { input: '', apiKey: 'sk-test' }),
      /must be a non-empty string/,
    );
  });

  it('translateApp: throws when sourceLang is empty', async () => {
    const io = {
      Excel: {
        Workbook: class {},
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    await assert.rejects(
      () =>
        translateApp(io, {
          input: 'test.xlsx',
          sourceLang: '',
          apiKey: 'sk-test',
        }),
      /must be a non-empty string/,
    );
  });

  it('translateApp: throws when workbook has no worksheets', async () => {
    const workbookMock = {
      worksheets: [],
    };

    const io = {
      Excel: {
        Workbook: class {
          constructor() {
            return workbookMock;
          }
        },
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    await assert.rejects(
      () => translateApp(io, { input: 'test.xlsx', apiKey: 'sk-test' }),
      /does not contain a worksheet/,
    );
  });

  it('translateApp: throws when header row is empty', async () => {
    const workbookMock = {
      worksheets: [
        {
          getRow: (n) => ({
            eachCell: (cb) => {
              // No headers
            },
          }),
        },
      ],
    };

    const io = {
      Excel: {
        Workbook: class {
          constructor() {
            return workbookMock;
          }
        },
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    await assert.rejects(
      () => translateApp(io, { input: 'test.xlsx', apiKey: 'sk-test' }),
      /header row is empty or missing/,
    );
  });

  it('translateApp: throws when source language column not found', async () => {
    const workbookMock = {
      worksheets: [
        {
          getRow: (n) => ({
            eachCell: (cb) => {
              if (n === 1) {
                cb({ value: 'key' }, 1);
                cb({ value: 'de' }, 2);
              }
            },
          }),
          eachRow: (cb) => {},
        },
      ],
    };

    const io = {
      Excel: {
        Workbook: class {
          constructor() {
            return workbookMock;
          }
        },
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    await assert.rejects(
      () =>
        translateApp(io, {
          input: 'test.xlsx',
          apiKey: 'sk-test',
          sourceLang: 'en',
        }),
      /Source header for "en" not found/,
    );
  });

  it('translateApp: handles no target columns gracefully', async () => {
    const workbookMock = {
      worksheets: [
        {
          getRow: (n) => ({
            eachCell: (cb) => {
              if (n === 1) {
                cb({ value: 'key' }, 1);
                cb({ value: 'en' }, 2);
              }
            },
          }),
          eachRow: (cb) => {},
        },
      ],
    };

    const io = {
      Excel: {
        Workbook: class {
          constructor() {
            return workbookMock;
          }
        },
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    const cap = captureConsole();
    try {
      await translateApp(io, {
        input: 'test.xlsx',
        apiKey: 'sk-test',
        sourceLang: 'en',
      });
      assert.match(cap.out, /No target language columns detected/);
    } finally {
      cap.restore();
    }
  });

  it('translateApp: handles no missing translations', async () => {
    const workbookMock = {
      worksheets: [
        {
          getRow: (n) => ({
            eachCell: (cb) => {
              if (n === 1) {
                cb({ value: 'key' }, 1);
                cb({ value: 'en' }, 2);
                cb({ value: 'de' }, 3);
              }
            },
            getCell: () => ({ value: null }),
          }),
          eachRow: (cb) => {
            const row2 = {
              getCell: (c) => {
                if (c === 2) return { value: 'Hello' };
                if (c === 3) return { value: 'Hallo' };
                return { value: 'k' };
              },
            };
            cb(row2, 2);
          },
        },
      ],
    };

    const io = {
      Excel: {
        Workbook: class {
          constructor() {
            return workbookMock;
          }
        },
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    const provider = new MockProvider();
    const cap = captureConsole();

    try {
      await translateApp(
        io,
        { input: 'test.xlsx', apiKey: 'sk-test' },
        { provider },
      );
      assert.match(cap.out, /No missing translations found/);
    } finally {
      cap.restore();
    }
  });

  it('translateApp: uses languageMap for column resolution', async () => {
    const workbookMock = {
      worksheets: [
        {
          getRow: (n) => ({
            eachCell: (cb) => {
              if (n === 1) {
                cb({ value: 'key' }, 1);
                cb({ value: 'English' }, 2);
                cb({ value: 'German' }, 3);
              }
            },
            getCell: () => ({ value: null }),
          }),
          eachRow: (cb) => {
            const row2 = {
              getCell: (c) => {
                if (c === 2) return { value: 'Hello' };
                if (c === 3) return { value: '' };
                return { value: 'k' };
              },
            };
            cb(row2, 2);
          },
        },
      ],
    };

    const io = {
      Excel: {
        Workbook: class {
          constructor() {
            return workbookMock;
          }
        },
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    const provider = new MockProvider();

    await translateApp(
      io,
      {
        input: 'test.xlsx',
        apiKey: 'sk-test',
        sourceLang: 'en',
        languageMap: { en: 'English', de: 'German' },
      },
      { provider },
    );
  });

  it('translateApp: falls back to fuzzy header matching', async () => {
    const workbookMock = {
      worksheets: [
        {
          getRow: (n) => ({
            eachCell: (cb) => {
              if (n === 1) {
                cb({ value: 'key' }, 1);
                cb({ value: 'English (en)' }, 2);
                cb({ value: 'de_DE' }, 3);
              }
            },
            getCell: () => ({ value: null }),
          }),
          eachRow: (cb) => {
            const row2 = {
              getCell: (c) => {
                if (c === 2) return { value: 'Test' };
                if (c === 3) return { value: '' };
                return { value: 'k' };
              },
            };
            cb(row2, 2);
          },
        },
      ],
    };

    const io = {
      Excel: {
        Workbook: class {
          constructor() {
            return workbookMock;
          }
        },
      },
      readWorkbook: async () => {},
      writeWorkbook: async () => {},
    };

    const provider = new MockProvider();

    await translateApp(
      io,
      {
        input: 'test.xlsx',
        apiKey: 'sk-test',
        sourceLang: 'en',
      },
      { provider },
    );
  });
});
