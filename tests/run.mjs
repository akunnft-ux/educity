import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here)
    .filter(f => f.endsWith('.test.mjs'))
    .sort();

let failed = 0;

for (const file of files) {
    console.log(`\n▶ ${file}`);
    const result = spawnSync(process.execPath, [join(here, file)], { stdio: 'inherit' });
    if (result.status !== 0) failed++;
}

console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed === 0 ? 0 : 1);
