import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const publishScript = new URL('publish.sh', import.meta.url).pathname;

test('publish.sh tags HEAD with the next version when an sdk-<N> directory changed', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'publish-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
  };
  const git = (...args) => execFileSync('git', args, { cwd: repo, env, encoding: 'utf8' }).trim();
  const runPublish = () => execFileSync(publishScript, { cwd: repo, env, encoding: 'utf8' }).trim();
  const commitFile = (path, contents) => {
    mkdirSync(join(repo, path, '..'), { recursive: true });
    writeFileSync(join(repo, path), contents);
    git('add', '-A');
    git('commit', '-qm', `${path}: ${contents}`);
    return git('rev-parse', 'HEAD');
  };
  const tagsAt = (commit) => git('tag', '--points-at', commit);

  git('init', '-q');
  let head = commitFile('sdk-54/default.json', 'first');
  assert.equal(runPublish(), 'v1.0.0');
  assert.equal(tagsAt(head), 'v1.0.0');

  assert.equal(runPublish(), '');
  head = commitFile('README.md', 'docs');
  assert.equal(runPublish(), '');
  assert.equal(git('tag'), 'v1.0.0');

  head = commitFile('sdk-55/scoped.json', 'new SDK');
  assert.equal(runPublish(), 'v1.0.1');
  assert.equal(tagsAt(head), 'v1.0.1');

  git('tag', 'v1.0.9');
  head = commitFile('sdk-54/default.json', 'second');
  assert.equal(runPublish(), 'v1.0.10');
  assert.equal(tagsAt(head), 'v1.0.10');
  commitFile('sdk-54/default.json', 'third');
  assert.equal(runPublish(), 'v1.0.11');
});
