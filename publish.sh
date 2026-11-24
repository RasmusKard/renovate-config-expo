#!/usr/bin/env bash
set -euo pipefail

last_tag=$(git tag --list 'v*' --sort=v:refname | tail -n 1)
if [[ -z $last_tag ]]; then
  tag=v1.0.0
elif git diff --quiet "$last_tag" HEAD -- 'sdk-*'; then
  exit 0
else
  tag=${last_tag%.*}.$((${last_tag##*.} + 1))
fi
git tag "$tag"
echo "$tag"
