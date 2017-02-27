#!/usr/bin/env bash

npm run build

BRANCH_NAME=build_$RANDOM

git checkout -b ${BRANCH_NAME}

git add -A
git add -f js/*-bundle.js
git commit -m 'build'

git push --force origin ${BRANCH_NAME}:gh-pages

git checkout -

git branch -D ${BRANCH_NAME}
