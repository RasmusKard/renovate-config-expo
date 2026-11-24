# renovate-config-expo

Renovate presets that keep the packages Expo manages at the versions your Expo SDK expects, so `npx expo-doctor` keeps passing. Renovate reads those versions from Expo's API on every run and proposes them in one PR, `Expo SDK <N>`.

## Usage

```json
{
  "extends": ["github>RasmusKard/renovate-config-expo//sdk-58/default"]
}
```

Renovate must be able to reach `https://api.expo.dev`.

The presets group these packages because separate PRs for `expo` and its modules each fail `npx expo-doctor`. A later `packageRules` entry with its own `groupName` overrides the group.

### Monorepos

The `scoped` preset applies only to package files that match its argument. The whole argument is one glob, so it can contain commas.

```json
{
  "extends": ["github>RasmusKard/renovate-config-expo//sdk-58/scoped(apps/mobile/**)"]
}
```

### Other forges

Extend `https://raw.githubusercontent.com/RasmusKard/renovate-config-expo/main/sdk-58/default.json`, or mirror this repository and extend it with `local>`.

## Upgrading the Expo SDK

Move to the next SDK's preset together with the app upgrade:

```sh
npx expo install expo@^<N>.0.0
npx expo install --fix
```

## Development

Requires Node 24.2 or later.

```sh
node --test
node generate.mjs   # rewrites sdk-<N>/ from Expo's API
```
