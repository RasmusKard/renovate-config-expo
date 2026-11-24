# renovate-config-expo

Renovate presets that keep the packages Expo manages at the versions your Expo SDK expects, so `npx expo-doctor` passes. Renovate reads those versions from `api.expo.dev` on every run and proposes them in one PR.

## Usage

```jsonc
{
  "extends": [
    "github>RasmusKard/renovate-config-expo//sdk-58/default#<SHA>" // v1.0.0
  ]
}
```

- Set `sdk-58` to your Expo SDK, and change it when you upgrade Expo.
- Renovate must be able to reach `https://api.expo.dev`.
- Pin the release commit. Get its SHA with `git ls-remote https://github.com/RasmusKard/renovate-config-expo refs/tags/v1.0.0`.
- Keep the `// v1.0.0` comment. Renovate uses it to update the SHA and the version in one PR.
- A PR that changes the SHA but not the version means the tag moved. Don't merge it.
