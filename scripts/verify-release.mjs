import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const tag = process.env.RELEASE_TAG;
assert.match(tag || '', /^v\d+\.\d+\.\d+$/, 'Select a stable version tag.');
assert.equal(process.env.GITHUB_REPOSITORY, 'duskmoth-dev/duskmoth-sdk');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.equal(tag, `v${pkg.version}`, 'Tag must match the package version.');
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Duskmoth-release-check',
  ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) };
const response = await fetch(`https://api.github.com/repos/duskmoth-dev/duskmoth-sdk/releases/tags/${tag}`,
  { headers, signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200, 'A published GitHub release must exist first.');
const release = await response.json();
assert.equal(release.draft, false);
assert.equal(release.prerelease, false);
assert.equal(release.tag_name, tag);
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tagged = execFileSync('git', ['rev-parse', `${tag}^{commit}`], { encoding: 'utf8' }).trim();
assert.equal(head, tagged, 'Only the exact release commit may be published.');
console.log(`Verified published release ${tag} at ${head}.`);
