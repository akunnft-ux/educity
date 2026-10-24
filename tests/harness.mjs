import assert from 'node:assert/strict';

const tests = [];
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    tests.push({ name, fn });
}

export async function run() {
    for (const { name, fn } of tests) {
        try {
            await fn();
            passed++;
            console.log(`  ✓ ${name}`);
        } catch (err) {
            failed++;
            failures.push({ name, err });
            console.log(`  ✗ ${name}`);
            console.log(`      ${err.message.split('\n')[0]}`);
        }
    }
    console.log(`\n${passed} passed, ${failed} failed, ${tests.length} total`);
    return failed === 0;
}

export { test, assert };
