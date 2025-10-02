import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function runCLI(args) {
    return new Promise((resolve) => {
        const proc = spawn(process.execPath, [path.resolve(projectRoot, 'cli.js'), ...args], {
            cwd: projectRoot,
            env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let out = '';
        let err = '';
        proc.stdout.on('data', (d) => {
            out += String(d);
        });
        proc.stderr.on('data', (d) => {
            err += String(d);
        });
        proc.on('exit', (code) => resolve({ code, out, err }));
    });
}

describe('Entry points', () => {
    it('library API exports are available (local main.js)', async () => {
        const m = await import('../src/main.js');
        assert.equal(typeof m.convertToExcel, 'function');
        assert.equal(typeof m.convertToJson, 'function');
    });

    it('importing cli.js does not start interactive CLI', async () => {
        const { code, out, err } = await (async () => {
            const proc = spawn(
                process.execPath,
                [
                    '-e',
                    'import(\'./cli.js\').then(()=>{}).catch(e=>{ console.error(e?.message||e); process.exit(1); });',
                ],
                {
                    cwd: projectRoot,
                    env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
                    stdio: ['ignore', 'pipe', 'pipe'],
                },
            );
            let out = '';
            let err = '';
            return await new Promise((resolve) => {
                proc.stdout.on('data', (d) => {
                    out += String(d);
                });
                proc.stderr.on('data', (d) => {
                    err += String(d);
                });
                proc.on('exit', (code) => resolve({ code, out, err }));
            });
        })();
        assert.equal(code, 0, 'process should exit 0');
        assert.equal(out.trim(), '');
        assert.equal(err.trim(), '');
    });

    it('CLI executes only when run directly', async () => {
        // Run with a simple non-interactive command that immediately exits using legacy flags
        const { code, out, err } = await runCLI([
            '--to-excel',
            '--input',
            'test/fixtures',
            '--output',
            'test/tmp/out.xlsx',
            '--sheet-name',
            'Translations',
            '--dry-run',
            '--no-report',
        ]);
        assert.equal(code, 0, err || '');
        // Should include header and a completion or dry-run line
        assert.match(out, /i18n-excel-manager|Dry-run/);
    });
});
