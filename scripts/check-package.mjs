import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.equal(manifest.name, '@duskmoth-dev/sdk');
assert.equal(manifest.license, 'MIT');
assert.equal(manifest.private, false);
assert.equal(manifest.publishConfig.access, 'public');
assert.equal(manifest.repository.url, 'https://github.com/duskmoth-dev/duskmoth-sdk.git');
assert.equal(Object.keys(manifest.dependencies || {}).length, 0);
assert.equal(Object.keys(manifest.devDependencies || {}).length, 0);

const [pack] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}));
const required = ['src/index.js', 'src/index.d.ts', 'src/validation.js', 'LICENSE',
  'README.md', 'SECURITY.md', 'examples/offline.mjs', 'examples/status.mjs',
  'examples/screen.mjs', 'examples/premium.mjs', 'docs/publishing.md'];
const files = new Set(pack.files.map(file => file.path));
for (const file of required) assert.ok(files.has(file), `Missing packaged file: ${file}`);
for (const file of files) {
  assert.ok(/^(?:package\.json|LICENSE|README\.md|SECURITY\.md|CONTRIBUTING\.md|CHANGELOG\.md|src\/|docs\/|examples\/)/.test(file),
    `Unexpected packaged file: ${file}`);
  assert.ok(!/(?:^|\/)(?:\.env(?:\..*)?|node_modules|\.git|data)(?:\/|$)/.test(file),
    `Private or generated package content: ${file}`);
}
console.log(`Verified ${pack.files.length} allowlisted package files for ${manifest.name}@${manifest.version}; no runtime dependencies.`);
