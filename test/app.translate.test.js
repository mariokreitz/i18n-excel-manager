import { describe, it } from 'node:test';

import { translateApp } from '../src/app/translate.js';

class MockProvider {
  async translateBatch(texts, s, t) {
    return texts.map((txt) => `[${t}] ${txt}`);
  }
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
});
