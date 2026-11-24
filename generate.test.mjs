import assert from 'node:assert/strict';
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
    assert.ok(rule.overrideDatasource.replace(/^custom\./, '') in preset.customDatasources);
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
  assert.deepEqual(
    scoped.packageRules,
    preset.packageRules.map((rule) => ({ ...rule, matchFileNames: ['{{args}}'] })),
  );
});
