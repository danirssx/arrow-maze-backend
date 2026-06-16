#!/usr/bin/env sh
set -eu

ticket="${1:?Usage: ./scripts/new-worktree.sh AM-42 feat auth-flow}"
type="${2:?Usage: ./scripts/new-worktree.sh AM-42 feat auth-flow}"
scope="${3:?Usage: ./scripts/new-worktree.sh AM-42 feat auth-flow}"

branch="$type/$scope-$ticket"
path="../am-$ticket"

git fetch origin
git worktree add "$path" -b "$branch" origin/develop

printf "Created worktree %s on branch %s\n" "$path" "$branch"
