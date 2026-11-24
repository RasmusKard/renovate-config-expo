# renovate-config-expo

Renovate presets that keep the packages Expo manages at the versions your Expo SDK expects, so `npx expo-doctor` keeps passing. Renovate reads those versions from Expo's API on every run and proposes them in one PR, `Expo SDK <N>`.

## Usage

Pin the preset for your SDK to a release commit, with the release version in a comment. Renovate accepts comments in `renovate.json`.

```jsonc
{
  "extends": [
    "github>RasmusKard/renovate-config-expo//sdk-58/default#<SHA>" // v1.0.0
  ]
}
```

Get the commit SHA of a release without an API call:

```sh
git ls-remote https://github.com/RasmusKard/renovate-config-expo refs/tags/v1.0.0
```

Renovate updates the SHA and the comment together in one PR. A new version appears whenever any SDK's preset changes, for example when Expo adds a package. A PR that changes only the SHA, for the same version, means the tag moved. Review it, and never automerge it.

To follow `main` instead, extend `github>RasmusKard/renovate-config-expo//sdk-58/default`.

Renovate must be able to reach `https://api.expo.dev`.

The presets group these packages because separate PRs for `expo` and its modules each fail `npx expo-doctor`. A later `packageRules` entry with its own `groupName` overrides the group.

### Monorepos

The `scoped` preset applies only to package files that match its argument. The whole argument is one glob, so it can contain commas.

```jsonc
{
  "extends": [
    "github>RasmusKard/renovate-config-expo//sdk-58/scoped#<SHA>(apps/mobile/**)" // v1.0.0
  ]
}
```

### Other forges

Extend `https://raw.githubusercontent.com/RasmusKard/renovate-config-expo/main/sdk-58/default.json`, or mirror this repository and extend it with `local>`. Renovate updates neither automatically.

## Upgrading the Expo SDK

Renovate does not propose the next SDK's preset. Change `sdk-<N>` in the preset path in the same PR as the app upgrade:

```sh
npx expo install expo@^<N>.0.0
npx expo install --fix
```

## Development

Requires Node 24.2 or later.

```sh
node --test
node generate.mjs   # rewrites sdk-<N>/ from Expo's API
./publish.sh        # tags HEAD with the next vX.Y.Z if any sdk-<N>/ changed, locally
```

The [update workflow](.github/workflows/update.yml) runs these daily and pushes the result.
