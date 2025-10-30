#!/bin/bash

# Exit on any error
set -e

echo "🔍 Finding the highest version tag..."

# Get all tags starting with 'v', sort them, and get the highest one
HIGHEST_TAG=$(git tag -l "v*" | sort -V | tail -n 1)

if [ -z "$HIGHEST_TAG" ]; then
    echo "❌ No version tags found starting with 'v'"
    echo "Creating initial tag v0.0.1"
    NEW_TAG="v0.0.1"
else
    echo "📌 Current highest tag: $HIGHEST_TAG"
    
    # Remove the 'v' prefix and split into major.minor.patch
    VERSION=${HIGHEST_TAG#v}
    MAJOR=$(echo $VERSION | cut -d. -f1)
    MINOR=$(echo $VERSION | cut -d. -f2)
    PATCH=$(echo $VERSION | cut -d. -f3)
    
    # Bump the patch version
    NEW_PATCH=$((PATCH + 1))
    NEW_TAG="v${MAJOR}.${MINOR}.${NEW_PATCH}"
fi

echo "🚀 Creating new tag: $NEW_TAG"
git tag $NEW_TAG

echo "📤 Pushing tag to origin main..."
git push origin $NEW_TAG

echo "✅ Successfully created and pushed tag: $NEW_TAG"

