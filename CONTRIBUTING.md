# Contributing

This document defines the working rules for commits and merge requests in `react-native-filesystem`.

## Core Principles

- Keep changes focused. One merge request should solve one clear problem.
- Prefer small, reviewable pull requests over large mixed changes.
- Match docs, types, and native implementations when changing the public API.
- Do not merge work that is untested or unclear.

## Branch Naming

Use short, descriptive branch names:

```text
feature/add-read-file
fix/android-stat-null
docs/update-readme-api
refactor/native-file-helpers
```

## Commit Message Rules

Use this format:

```text
<type>: <short summary>
```

Recommended commit types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation only
- `refactor`: code cleanup without behavior change
- `test`: tests added or updated
- `chore`: tooling, config, dependency, or maintenance work

### Commit Message Guidelines

- Write the summary in lowercase except for proper nouns.
- Keep the summary short and specific, ideally under 72 characters.
- Use the imperative mood.
- Describe what changed, not what you were doing.
- Avoid vague messages like `update code`, `fix stuff`, or `change files`.

Good examples:

```text
feat: add readFile and writeFile native methods
fix: return null modificationTime for missing paths
docs: document filesystem api in readme
refactor: extract android recursive copy helper
```

Avoid:

```text
feat: new update
fix: bug
chore: changes
```

## Commit Scope Expectations

Before committing, make sure:

- The change builds successfully when relevant.
- Public API updates include matching TypeScript types.
- Native API updates stay aligned across iOS and Android.
- Documentation is updated when the user-facing behavior changes.

## Merge Request Rules

For GitHub, this means Pull Requests. If your team says "MR", use the same rules.

### A merge request should include

- A clear title that explains the change
- A short description of the problem and solution
- Notes about platform impact: iOS, Android, web, or docs
- Test or verification notes
- Screenshots only when UI changes are involved

### Title format

Use the same style as commits when possible:

```text
feat: add initial filesystem operations
fix: handle missing source path in move
docs: add contribution and pr rules
```

### Merge request checklist

- The branch is up to date with the target branch
- The change is focused and does not include unrelated edits
- Code style follows the existing project conventions
- New public APIs are typed
- README or docs are updated if needed
- Build, lint, or manual verification has been completed
- Risks or known limitations are called out clearly

## Review Expectations

- Prefer actionable review comments over broad criticism.
- Call out behavior regressions, platform gaps, and missing tests first.
- If a change is intentionally incomplete, state that explicitly in the MR.
- Resolve review comments before merge, or explain why a comment is not being applied.

## Suggested MR Description Template

```text
## Summary
- what changed
- what changed

## Why
- why this change is needed

## Verification
- npm run build
- manual test on ios
- manual test on android

## Notes
- limitations, follow-up work, or risks
```

## Rules For Filesystem API Changes

When adding or changing filesystem methods:

- Update [src/ReactNativeFilesystemModule.ts](/Users/khang/Documents/Nexa/react-native-filesystem/src/ReactNativeFilesystemModule.ts)
- Update [src/ReactNativeFilesystem.types.ts](/Users/khang/Documents/Nexa/react-native-filesystem/src/ReactNativeFilesystem.types.ts) if return types or payloads change
- Keep [ios/ReactNativeFilesystemModule.swift](/Users/khang/Documents/Nexa/react-native-filesystem/ios/ReactNativeFilesystemModule.swift) and [android/src/main/java/expo/modules/filesystem/ReactNativeFilesystemModule.kt](/Users/khang/Documents/Nexa/react-native-filesystem/android/src/main/java/expo/modules/filesystem/ReactNativeFilesystemModule.kt) behavior aligned
- Document any unsupported web behavior in [src/ReactNativeFilesystemModule.web.ts](/Users/khang/Documents/Nexa/react-native-filesystem/src/ReactNativeFilesystemModule.web.ts)

### API Naming Stability

Public parameter names, option keys, event payload fields, and return object properties are part of the API contract.

- Keep public names consistent across versions.
- Do not silently rename, remove, or repurpose an existing public field.
- If the API needs to grow, prefer adding a new optional field instead of changing an existing one.
- If a rename is unavoidable, treat it as a breaking change and document the migration clearly.
- iOS, Android, TypeScript, README, and wiki docs must use the same public property names.

Examples:

- Good: add `encoding?: 'utf8' | 'base64'` while keeping existing `path` and `contents`
- Good: add a new optional response field without changing existing field meanings
- Avoid: rename `contents` to `data` in one platform or one release without a documented breaking change
- Avoid: return `filePath` on Android and `path` on iOS for the same API

## When Not To Merge

Do not merge if:

- The MR mixes refactors and new features without explanation
- One platform was updated but the others were silently left behind
- The API shape changed without matching docs or types
- The author cannot explain how the change was verified
