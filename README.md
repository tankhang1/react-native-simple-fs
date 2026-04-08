# react-native-filesystem

A cross-platform Expo module for reading, writing, and managing local files in React Native.

This package provides a native filesystem API for iOS and Android, plus typed helpers for resolving common directories such as the app `Documents` folder.

## Features

- Read and write text files
- Check whether a file or directory exists
- Create and list directories
- Delete, move, and copy files or directories
- Get metadata with `stat`
- Resolve the app documents directory
- Save to Android Downloads
- Export to the iOS Files picker
- Use typed directory descriptors instead of raw strings when helpful

## Installation

```bash
npm install react-native-filesystem
```

This package is built as an Expo module, so native linking should happen automatically during your iOS and Android builds.

## Platform Notes

### Android

- `getDocumentsDirectory()` returns your app-private files directory.
- `writeFileToDownloads(filename, contents, mimeType)` writes directly to Downloads and returns the saved path or `content://` URI.

### iOS

- `getDocumentsDirectory()` returns your app documents directory.
- `writeFile(path, contents)` writes directly to a path inside your app sandbox.
- `writeFileToDownloads(filename, contents, mimeType)` opens the native Files save picker so the user chooses where to save.

Important: iOS does not offer a silent public Downloads location like Android. Saving outside the app container requires user interaction.

### Web

- Local filesystem methods are not supported and will throw.

## Quick Start

```tsx
import ReactNativeFilesystem, {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-filesystem';

async function quickStart() {
  const filePath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'hello.txt'
  );

  await ReactNativeFilesystem.writeFile(filePath, 'Hello from React Native Filesystem');

  const exists = await ReactNativeFilesystem.exists(filePath);
  const contents = await ReactNativeFilesystem.readFile(filePath);

  console.log({ filePath, exists, contents });
}
```

## Import Styles

```ts
import ReactNativeFilesystem from 'react-native-filesystem';
```

```ts
import {
  ReactNativeFilesystemDirectoryKind,
  joinReactNativeFilesystemPath,
  resolveReactNativeFilesystemDirectory,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-filesystem';
```

## Types

### `ReactNativeFilesystemStat`

```ts
type ReactNativeFilesystemStat = {
  path: string;
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modificationTime: number | null;
};
```

### `ReactNativeFilesystemDirectoryKind`

```ts
enum ReactNativeFilesystemDirectoryKind {
  Documents = 'documents',
  Custom = 'custom',
}
```

### `ReactNativeFilesystemDirectoryDescriptor`

```ts
type ReactNativeFilesystemDirectoryDescriptor =
  | { kind: ReactNativeFilesystemDirectoryKind.Documents }
  | { kind: ReactNativeFilesystemDirectoryKind.Custom; path: string };
```

## Directory Helpers

These helpers make it easier to work with app directories without hardcoding raw paths everywhere.

### `joinReactNativeFilesystemPath(...segments)`

Joins path segments and removes duplicate slashes.

```ts
const fullPath = joinReactNativeFilesystemPath(
  '/data/user/0/app/files/',
  '/images/',
  'avatar.txt'
);

console.log(fullPath);
// /data/user/0/app/files/images/avatar.txt
```

### `resolveReactNativeFilesystemDirectory(directory)`

Resolves a typed directory descriptor to a real filesystem path.

```ts
const documentsPath = await resolveReactNativeFilesystemDirectory({
  kind: ReactNativeFilesystemDirectoryKind.Documents,
});
```

```ts
const customPath = await resolveReactNativeFilesystemDirectory({
  kind: ReactNativeFilesystemDirectoryKind.Custom,
  path: '/tmp/my-folder',
});
```

### `resolveReactNativeFilesystemFilePath(directory, filename)`

Builds a file path from a directory descriptor plus a filename.

```ts
const invoicePath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'invoice.txt'
);
```

## API Reference

### `PI`

Exposes the native value of `Math.PI`.

```ts
console.log(ReactNativeFilesystem.PI);
```

### `hello()`

Returns a simple native greeting string.

```ts
const message = ReactNativeFilesystem.hello();
console.log(message);
// Hello world! 👋
```

### `setValueAsync(value)`

Sends a value to native code and emits the `onChange` event.

```ts
await ReactNativeFilesystem.setValueAsync('Updated from JS');
```

### `getDocumentsDirectory()`

Returns the app documents directory path.

```ts
const documentsDirectory = await ReactNativeFilesystem.getDocumentsDirectory();
console.log(documentsDirectory);
```

Typical use:

```ts
const documentsDirectory = await ReactNativeFilesystem.getDocumentsDirectory();
const notesFilePath = `${documentsDirectory}/notes.txt`;
```

### `exists(path)`

Checks whether a file or directory exists.

```ts
const exists = await ReactNativeFilesystem.exists('/tmp/demo.txt');
console.log(exists);
```

Typical use:

```ts
if (!(await ReactNativeFilesystem.exists(filePath))) {
  await ReactNativeFilesystem.writeFile(filePath, 'First file contents');
}
```

### `readFile(path)`

Reads a UTF-8 text file.

```ts
const contents = await ReactNativeFilesystem.readFile(filePath);
console.log(contents);
```

Typical use:

```ts
try {
  const jsonText = await ReactNativeFilesystem.readFile(configPath);
  const config = JSON.parse(jsonText);
  console.log(config);
} catch (error) {
  console.error('Failed to read config', error);
}
```

### `writeFile(path, contents)`

Writes UTF-8 text to a file.

```ts
await ReactNativeFilesystem.writeFile(filePath, 'Hello from file');
```

Typical use:

```ts
const directory = await ReactNativeFilesystem.getDocumentsDirectory();
const profilePath = `${directory}/profile.txt`;

await ReactNativeFilesystem.writeFile(profilePath, 'Jane Doe');
```

Note: this writes directly to the exact path you provide. On iOS, if that path is inside the app documents directory, Files will show it under your app's folder.

### `writeFileToDownloads(filename, contents, mimeType?)`

Saves a file using a platform-specific "download/export" flow.

```ts
const savedPath = await ReactNativeFilesystem.writeFileToDownloads(
  'report.txt',
  'Quarterly report contents',
  'text/plain'
);

console.log(savedPath);
```

Behavior:

- Android: saves to Downloads directly.
- iOS: opens the Files save picker and returns the chosen destination path.

Typical use:

```ts
await ReactNativeFilesystem.writeFileToDownloads(
  'export.json',
  JSON.stringify({ ok: true }, null, 2),
  'application/json'
);
```

### `deleteFile(path)`

Deletes a file or directory path.

```ts
await ReactNativeFilesystem.deleteFile(filePath);
```

Typical use:

```ts
if (await ReactNativeFilesystem.exists(cachePath)) {
  await ReactNativeFilesystem.deleteFile(cachePath);
}
```

### `mkdir(path)`

Creates a directory.

```ts
await ReactNativeFilesystem.mkdir('/tmp/images');
```

Typical use:

```ts
const documentsDirectory = await ReactNativeFilesystem.getDocumentsDirectory();
const exportDirectory = `${documentsDirectory}/exports`;

await ReactNativeFilesystem.mkdir(exportDirectory);
```

Purpose:

- prepare folders before writing files
- separate files into groups such as `images`, `exports`, or `logs`

### `readdir(path)`

Lists the names inside a directory.

```ts
const entries = await ReactNativeFilesystem.readdir(directoryPath);
console.log(entries);
```

Typical use:

```ts
const documentsDirectory = await ReactNativeFilesystem.getDocumentsDirectory();
const files = await ReactNativeFilesystem.readdir(documentsDirectory);

files.forEach((name) => {
  console.log('Found item:', name);
});
```

Purpose:

- inspect saved files
- build a file list UI
- check whether a directory contains expected output

### `stat(path)`

Returns metadata about a file or directory.

```ts
const info = await ReactNativeFilesystem.stat(filePath);
console.log(info);
```

Example result:

```ts
{
  path: '/tmp/demo.txt',
  exists: true,
  isFile: true,
  isDirectory: false,
  size: 24,
  modificationTime: 1700000000
}
```

Typical use:

```ts
const stat = await ReactNativeFilesystem.stat(filePath);

if (stat.exists && stat.isFile) {
  console.log(`File size: ${stat.size}`);
}
```

### `move(from, to)`

Moves a file or directory to a new location.

```ts
await ReactNativeFilesystem.move(
  '/tmp/draft.txt',
  '/tmp/archive/draft.txt'
);
```

Typical use:

```ts
const documentsDirectory = await ReactNativeFilesystem.getDocumentsDirectory();

await ReactNativeFilesystem.move(
  `${documentsDirectory}/draft.txt`,
  `${documentsDirectory}/published.txt`
);
```

### `copy(from, to)`

Copies a file or directory to a new location.

```ts
await ReactNativeFilesystem.copy(
  '/tmp/source.txt',
  '/tmp/backup/source.txt'
);
```

Typical use:

```ts
const documentsDirectory = await ReactNativeFilesystem.getDocumentsDirectory();

await ReactNativeFilesystem.copy(
  `${documentsDirectory}/important.txt`,
  `${documentsDirectory}/important-backup.txt`
);
```

## Common Patterns

### Save to the App Documents Directory

```ts
const filePath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'note.txt'
);

await ReactNativeFilesystem.writeFile(filePath, 'Saved in app documents');
```

### Use a Typed Custom Directory

```ts
const customDirectory = {
  kind: ReactNativeFilesystemDirectoryKind.Custom,
  path: '/tmp/my-feature',
} as const;

const customFilePath = await resolveReactNativeFilesystemFilePath(
  customDirectory,
  'debug.txt'
);

await ReactNativeFilesystem.mkdir(customDirectory.path);
await ReactNativeFilesystem.writeFile(customFilePath, 'debug output');
```

### Export a File for the User

```ts
await ReactNativeFilesystem.writeFileToDownloads(
  'shareable.txt',
  'User export contents',
  'text/plain'
);
```

Use this when:

- Android should save to Downloads
- iOS should prompt the user with the Files picker

## Events

Use Expo's `useEvent` helper to subscribe to `onChange`.

```tsx
import { useEvent } from 'expo';
import ReactNativeFilesystem from 'react-native-filesystem';

function Example() {
  const payload = useEvent(ReactNativeFilesystem, 'onChange');

  return <Text>{payload?.value ?? 'No value yet'}</Text>;
}
```

Event payload:

```ts
type ChangeEventPayload = {
  value: string;
};
```

## Native View

The package also exports a native `WebView`-backed view component.

```tsx
import { ReactNativeFilesystemView } from 'react-native-filesystem';

export default function ExampleView() {
  return (
    <ReactNativeFilesystemView
      url="https://www.example.com"
      onLoad={({ nativeEvent }) => {
        console.log('Loaded:', nativeEvent.url);
      }}
      style={{ flex: 1, minHeight: 240 }}
    />
  );
}
```

Props:

```ts
type ReactNativeFilesystemViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: { url: string } }) => void;
  style?: StyleProp<ViewStyle>;
};
```

## Development

Build:

```bash
npm run build
```

Run package tests:

```bash
npm test
```

Run example tests:

```bash
npm run test:example
```

Open native example projects:

```bash
npm run open:ios
npm run open:android
```

## Project Structure

```text
src/        TypeScript API and path helpers
ios/        iOS native module and native view
android/    Android native module and native view
example/    Example Expo app for manual testing
```

## Support

- Website: [https://nexa-tech-team.vercel.app/](https://nexa-tech-team.vercel.app/)
- Email: [cs.nexatech@gmail.com](mailto:cs.nexatech@gmail.com)
- Alternate email: [doank3442@gmail.com](mailto:doank3442@gmail.com)

## License

MIT
