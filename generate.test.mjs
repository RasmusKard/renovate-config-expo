import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { presetFiles } from './generate.mjs';

const files = presetFiles(54, {
  sdkVersion: '54.0.0',
  versionsEndpointPackages: ['expo', 'react', 'react-native'],
  nativeModulesEndpointPackages: ['@expo/vector-icons', 'expo-camera'],
});
const preset = JSON.parse(files['default.json']);

test('presetFiles reads versions from the Expo API for that SDK', () => {
  const { 'expo-sdk-54-native-modules': nativeModules, 'expo-sdk-54-versions': versions } =
    preset.customDatasources;
  assert.equal(nativeModules.defaultRegistryUrlTemplate, 'https://api.expo.dev/v2/sdks/54.0.0/native-modules');
  assert.equal(versions.defaultRegistryUrlTemplate, 'https://api.expo.dev/v2/versions/latest');
  assert.match(versions.transformTemplates[0], /data\.sdkVersions\.`54\.0\.0`/);
});

test('presetFiles routes each package through exactly one rule in one group', () => {
  const datasourceByName = {};
  for (const rule of preset.packageRules) {
    assert.deepEqual(rule.matchDatasources, ['npm']);
    assert.equal(rule.groupName, 'Expo SDK 54');
    const datasource = preset.customDatasources[rule.overrideDatasource.replace(/^custom\./, '')];
    assert.deepEqual(rule.registryUrls, [datasource.defaultRegistryUrlTemplate]);
    for (const name of rule.matchPackageNames) {
      assert.ok(!(name in datasourceByName), `${name} is in more than one rule`);
      datasourceByName[name] = rule.overrideDatasource;
    }
  }
  assert.deepEqual(datasourceByName, {
    '@expo/vector-icons': 'custom.expo-sdk-54-native-modules',
    'expo-camera': 'custom.expo-sdk-54-native-modules',
    expo: 'custom.expo-sdk-54-versions',
    react: 'custom.expo-sdk-54-versions',
    'react-native': 'custom.expo-sdk-54-versions',
  });
});

test('the scoped preset limits the same rules to the files in its argument', () => {
  assert.deepEqual(Object.keys(files).sort(), ['default.json', 'scoped.json']);
  const scoped = JSON.parse(files['scoped.json']);
  assert.deepEqual(scoped.customDatasources, preset.customDatasources);
  assert.deepEqual(scoped.customManagers, preset.customManagers);
  assert.deepEqual(
    scoped.packageRules,
    preset.packageRules.map((rule) => ({ ...rule, matchFileNames: ['{{args}}'] })),
  );
});

test('the pin manager reads Renovate config files only', () => {
  const [{ managerFilePatterns }] = preset.customManagers;
  const fileRegex = new RegExp(managerFilePatterns[0].slice(1, -1));
  for (const file of ['renovate.json', 'renovate.json5', '.renovaterc', '.renovaterc.json', '.github/renovate.json5', '.gitlab/.renovaterc.json']) {
    assert.match(file, fileRegex);
  }
  for (const file of ['package.json', 'renovate.json.bak', 'apps/x-renovate.json']) {
    assert.doesNotMatch(file, fileRegex);
  }
});

test('the pin manager reads the SHA and version from the README usage lines', () => {
  const [{ matchStrings, depNameTemplate, datasourceTemplate }] = preset.customManagers;
  assert.equal(depNameTemplate, 'RasmusKard/renovate-config-expo');
  assert.equal(datasourceTemplate, 'github-tags');
  const sha = '0123456789abcdef0123456789abcdef01234567';
  const [defaultLine] = readFileSync(new URL('README.md', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.includes('#<SHA>'))
    .map((line) => line.replace('<SHA>', sha));
  const scopedLine = defaultLine.replace(`/default#${sha}`, `/scoped#${sha}(apps/mobile/**)`);
  assert.notEqual(scopedLine, defaultLine);
  const readmeLines = [defaultLine, scopedLine];
  const json5Lines = readmeLines.map((line) => line.replaceAll('"', "'").replace("' //", "', //"));
  assert.ok(json5Lines.every((line) => line.includes("', // v1.0.0")));
  for (const line of [...readmeLines, ...json5Lines]) {
    const { currentDigest, currentValue } = line.match(new RegExp(matchStrings[0])).groups;
    assert.deepEqual({ currentDigest, currentValue }, { currentDigest: sha, currentValue: 'v1.0.0' }, line);
  }
  for (const line of readmeLines) {
    assert.doesNotMatch(line.replace(/\s*\/\/ v1\.0\.0$/, ''), new RegExp(matchStrings[0]));
  }
});
