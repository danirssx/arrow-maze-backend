#!/usr/bin/env sh
set -eu

output="AI_USAGE.md"
tmp="$(mktemp)"

awk 'BEGIN { keep=1 } /<!-- AI_LOG_ENTRIES_START -->/ { print; print ""; keep=0; exit } { print }' "$output" > "$tmp"

if find ai-log -name "*.md" -type f | grep -q .; then
  find ai-log -name "*.md" -type f | sort | while read -r file; do
    printf "\n---\n\n" >> "$tmp"
    cat "$file" >> "$tmp"
    printf "\n" >> "$tmp"
  done
else
  printf "No compiled entries yet.\n" >> "$tmp"
fi

printf "\n<!-- AI_LOG_ENTRIES_END -->\n" >> "$tmp"
awk 'BEGIN { skip=1 } /<!-- AI_LOG_ENTRIES_END -->/ { skip=0; next } skip==0 { print }' "$output" >> "$tmp"
mv "$tmp" "$output"
