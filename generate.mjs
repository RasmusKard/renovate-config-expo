import { mkdir, writeFile } from 'node:fs/promises';

const EXPO_API = 'https://api.expo.dev/v2';

async function fetchExpoApi(path) {
  const response = await fetch(`${EXPO_API}${path}`);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return (await response.json()).data;
}

export async function fetchSdkPackages() {
  const { sdkVersions } = await fetchExpoApi('/versions/latest');
  const supportedSdks = Object.entries(sdkVersions).filter(
    ([, sdkInfo]) => !sdkInfo.isDeprecated && sdkInfo.expoVersion,
  );
  return new Map(
    await Promise.all(
      supportedSdks.map(async ([sdkVersion, sdkInfo]) => {
        const versionsEndpointPackages = new Set([
          ...Object.keys(sdkInfo.relatedPackages ?? {}),
          ...(sdkInfo.facebookReactVersion ? ['react', 'react-dom'] : []),
          'react-native',
          'expo',
        ]);
        const nativeModulesEndpointPackages = (await fetchExpoApi(`/sdks/${sdkVersion}/native-modules`))
          .map(({ npmPackage }) => npmPackage)
          .filter((name) => !versionsEndpointPackages.has(name));
        return [
          Number.parseInt(sdkVersion, 10),
          {
            sdkVersion,
            versionsEndpointPackages: [...versionsEndpointPackages].sort(),
            nativeModulesEndpointPackages: nativeModulesEndpointPackages.sort(),
          },
        ];
      }),
    ),
  );
}

const presetPinManager = {
  customType: 'regex',
  managerFilePatterns: [String.raw`/(^|/)(renovate\.json5?|\.renovaterc(\.json5?)?)$/`],
  matchStrings: [
    String.raw`["']github>RasmusKard/renovate-config-expo//sdk-\d+/(default|scoped)#(?<currentDigest>[0-9a-f]{40})(\([^"'\n]*\))?["'],?[ \t]*//[ \t]*(?<currentValue>v\d+\.\d+\.\d+)`,
  ],
  depNameTemplate: 'RasmusKard/renovate-config-expo',
  datasourceTemplate: 'github-tags',
};

const releasesTransform = (statements, expoRange) =>
  `( ${[...statements, `$r := ${expoRange};`].join(' ')} $r ? {"releases": [` +
  `{"version": $replace('{{currentValue}}', /^[~^v]+/, '')}, ` +
  `{"version": $replace($r, /^[~^v]+/, '')}]} : {"releases": []} )`;

export function presetFiles(sdkMajor, { sdkVersion, versionsEndpointPackages, nativeModulesEndpointPackages }) {
  const nativeModulesSource = `expo-sdk-${sdkMajor}-native-modules`;
  const versionsSource = `expo-sdk-${sdkMajor}-versions`;
  const customDatasources = {
    [nativeModulesSource]: {
      defaultRegistryUrlTemplate: `${EXPO_API}/sdks/${sdkVersion}/native-modules`,
      transformTemplates: [
        releasesTransform([], "data[npmPackage = '{{packageName}}'].versionRange"),
      ],
    },
    [versionsSource]: {
      defaultRegistryUrlTemplate: `${EXPO_API}/versions/latest`,
      transformTemplates: [
        releasesTransform(
          [
            `$s := data.sdkVersions.\`${sdkVersion}\`;`,
            "$all := $merge([$s.relatedPackages, $s.facebookReactVersion ? {'react': $s.facebookReactVersion, 'react-dom': $s.facebookReactVersion} : {}, {'expo': $s.expoVersion}, {'react-native': $s.facebookReactNativeVersion}]);",
          ],
          "$lookup($all, '{{packageName}}')",
        ),
      ],
    },
  };
  const rules = [
    [nativeModulesSource, nativeModulesEndpointPackages],
    [versionsSource, versionsEndpointPackages],
  ].map(([source, packageNames]) => ({
    matchDatasources: ['npm'],
    matchPackageNames: packageNames,
    overrideDatasource: `custom.${source}`,
    registryUrls: [customDatasources[source].defaultRegistryUrlTemplate],
    groupName: `Expo SDK ${sdkMajor}`,
  }));
  const renovatePreset = (description, packageRules) =>
    `${JSON.stringify(
      {
        $schema: 'https://docs.renovatebot.com/renovate-schema.json',
        description,
        customDatasources,
        packageRules,
        customManagers: [presetPinManager],
      },
      null,
      2,
    )}\n`;
  const description = `Keep the packages Expo manages at the versions Expo specifies for SDK ${sdkMajor}`;
  return {
    'default.json': renovatePreset(description, rules),
    'scoped.json': renovatePreset(
      `${description}, in the files matching the preset argument`,
      rules.map((rule) => ({ matchFileNames: ['{{args}}'], ...rule })),
    ),
  };
}

if (import.meta.main) {
  for (const [sdkMajor, packages] of await fetchSdkPackages()) {
    const sdkDir = new URL(`sdk-${sdkMajor}/`, import.meta.url);
    await mkdir(sdkDir, { recursive: true });
    for (const [fileName, contents] of Object.entries(presetFiles(sdkMajor, packages))) {
      await writeFile(new URL(fileName, sdkDir), contents);
    }
  }
}
