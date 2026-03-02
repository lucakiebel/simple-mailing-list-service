#!/usr/bin/env bash
set -euo pipefail

IMAGE_BASE=$(node -p "require('./package.json').image")

VERSION=$(node -p "require('./package.json').version")

TAG="v${VERSION}"

echo "Detected version from package.json: ${VERSION}"
echo "Using Docker tags: ${TAG} and latest"
echo "Building image: ${IMAGE_BASE}:${TAG} and ${IMAGE_BASE}:latest"
echo

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --no-cache \
  --pull \
  -t "${IMAGE_BASE}:${TAG}" \
  -t "${IMAGE_BASE}:latest" \
  --push \
  .

echo
echo "✅ Done. Pushed:"
echo "  - ${IMAGE_BASE}:${TAG}"
echo "  - ${IMAGE_BASE}:latest"
