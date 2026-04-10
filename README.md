# react-native-simple-fs

[![npm version](https://img.shields.io/npm/v/react-native-simple-fs.svg)](https://www.npmjs.com/package/react-native-simple-fs)

Cross-platform Expo filesystem module for React Native.

This package helps you:

- read text files
- write text files
- download files from `http` or `https` URLs
- create folders
- check whether a file exists
- list folder contents
- move, copy, and delete files
- save files to Android Downloads
- export files with the iOS Files picker

Package: https://www.npmjs.com/package/react-native-simple-fs

## Install

### Step 1: install the package

```bash
npm install react-native-simple-fs
```

### Step 2: rebuild your native app

If your app already has native folders, rebuild after installing:

```bash
npx expo run:android
```

```bash
npx expo run:ios
```

If you use EAS or your own CI builds, just make sure the next native build includes this package.

## How It Works

There are 2 common places to save files:

### 1. App Documents directory

Use this when:

- you want to store files inside your app
- you want full read/write control
- you want to download a file to a private app path

### 2. Downloads / Files export flow

Use this when:

- you want the user to save a file outside the app
- you want the file to be visible in Downloads on Android
- you want the iOS Files picker to appear so the user chooses the location

## Step-by-Step Quick Start

### Step 1: import the package

```ts
import ReactNativeFilesystem, {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';
```

### Step 2: create a file path inside Documents

```ts
const filePath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'hello.txt'
);
```

What this does:

- finds your app Documents directory
- joins it with `hello.txt`
- gives you a safe local path to use

### Step 3: write text to the file

```ts
await ReactNativeFilesystem.writeFile(filePath, 'Hello from React Native');
```

### Step 4: check whether the file exists

```ts
const exists = await ReactNativeFilesystem.exists(filePath);
console.log(exists);
```

### Step 5: read the file back

```ts
const contents = await ReactNativeFilesystem.readFile(filePath);
console.log(contents);
```

### Full example

```ts
import ReactNativeFilesystem, {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';

async function quickStart() {
  const filePath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'hello.txt'
  );

  await ReactNativeFilesystem.writeFile(filePath, 'Hello from React Native');

  const exists = await ReactNativeFilesystem.exists(filePath);
  const contents = await ReactNativeFilesystem.readFile(filePath);

  console.log({ filePath, exists, contents });
}
```

## Step-by-Step: Download a File from HTTPS

Use this flow when you want to download a remote file and save it inside your app.

### Step 1: create the destination path

```ts
const destinationPath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'remote-file.txt'
);
```

### Step 2: download the file

```ts
const result = await ReactNativeFilesystem.downloadFile(
  'https://www.w3.org/TR/PNG/iso_8859-1.txt',
  destinationPath
);
```

### Step 3: inspect the result

```ts
console.log(result);
```

Example result:

```ts
{
  path: '/.../remote-file.txt',
  bytesWritten: 6121,
  statusCode: 200
}
```

### Step 4: read the file if it is text

```ts
const contents = await ReactNativeFilesystem.readFile(destinationPath);
console.log(contents);
```

Important:

- `readFile()` is for UTF-8 text
- if you download an image, zip, pdf, or video, do not read it with `readFile()`

### Full download example

```ts
import ReactNativeFilesystem, {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';

async function downloadExample() {
  const destinationPath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'remote-file.txt'
  );

  const result = await ReactNativeFilesystem.downloadFile(
    'https://www.w3.org/TR/PNG/iso_8859-1.txt',
    destinationPath
  );

  const contents = await ReactNativeFilesystem.readFile(destinationPath);

  console.log({ result, contents });
}
```

## Step-by-Step: Save to Downloads or Files

Use this when you want the user to receive a visible exported file.

### Step 1: call `writeFileToDownloads`

```ts
const savedPath = await ReactNativeFilesystem.writeFileToDownloads(
  'report.txt',
  'Quarterly report contents',
  'text/plain'
);
```

### Step 2: use the returned path

```ts
console.log(savedPath);
```

Platform behavior:

- Android: writes directly to Downloads
- iOS: opens the Files picker and returns the chosen destination path

### Full export example

```ts
import ReactNativeFilesystem from 'react-native-simple-fs';

async function exportExample() {
  const savedPath = await ReactNativeFilesystem.writeFileToDownloads(
    'report.txt',
    'Quarterly report contents',
    'text/plain'
  );

  console.log(savedPath);
}
```

## Step-by-Step: Create and Read a Folder

### Step 1: get the documents directory

```ts
const documentsDirectory = await ReactNativeFilesystem.getDocumentsDirectory();
```

### Step 2: define a folder path

```ts
const folderPath = `${documentsDirectory}/exports`;
```

### Step 3: create the folder

```ts
await ReactNativeFilesystem.mkdir(folderPath);
```

### Step 4: list folder contents

```ts
const entries = await ReactNativeFilesystem.readdir(folderPath);
console.log(entries);
```

## Copy-Paste Recipes

### Read JSON from a file

```ts
import ReactNativeFilesystem from 'react-native-simple-fs';

async function readJsonFile(path: string) {
  const raw = await ReactNativeFilesystem.readFile(path);
  return JSON.parse(raw);
}
```

### Write JSON to a file

```ts
import ReactNativeFilesystem from 'react-native-simple-fs';

async function writeJsonFile(path: string, data: unknown) {
  await ReactNativeFilesystem.writeFile(
    path,
    JSON.stringify(data, null, 2)
  );
}
```

### Create a folder only if it does not exist

```ts
import ReactNativeFilesystem from 'react-native-simple-fs';

async function ensureFolder(path: string) {
  if (!(await ReactNativeFilesystem.exists(path))) {
    await ReactNativeFilesystem.mkdir(path);
  }
}
```

### Delete a file only if it exists

```ts
import ReactNativeFilesystem from 'react-native-simple-fs';

async function safeDelete(path: string) {
  if (await ReactNativeFilesystem.exists(path)) {
    await ReactNativeFilesystem.deleteFile(path);
  }
}
```

### Move a file

```ts
import ReactNativeFilesystem from 'react-native-simple-fs';

async function moveFile(from: string, to: string) {
  await ReactNativeFilesystem.move(from, to);
}
```

### Copy a file

```ts
import ReactNativeFilesystem from 'react-native-simple-fs';

async function copyFile(from: string, to: string) {
  await ReactNativeFilesystem.copy(from, to);
}
```

## Imports

Default import:

```ts
import ReactNativeFilesystem from 'react-native-simple-fs';
```

Helpers and types:

```ts
import {
  ReactNativeFilesystemDirectoryKind,
  joinReactNativeFilesystemPath,
  resolveReactNativeFilesystemDirectory,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';
```

## Platform Notes

### Android

- `getDocumentsDirectory()` returns your app-private files directory
- `writeFileToDownloads()` writes directly to Downloads
- the returned download location can be a normal path or a `content://` URI depending on Android version

### iOS

- `getDocumentsDirectory()` returns your app documents directory
- writing to paths inside that directory works directly
- `writeFileToDownloads()` opens the Files picker so the user selects a destination

Important: iOS does not support silent saving to a public Downloads folder like Android does.

### Web

- local filesystem methods are not supported on web
- calling them on web will throw an error

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

### `ReactNativeFilesystemDownloadResult`

```ts
type ReactNativeFilesystemDownloadResult = {
  path: string;
  bytesWritten: number;
  statusCode: number;
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

## Path Helpers

### `joinReactNativeFilesystemPath(...segments)`

Joins path segments and removes duplicate slashes.

```ts
import { joinReactNativeFilesystemPath } from 'react-native-simple-fs';

const fullPath = joinReactNativeFilesystemPath(
  '/data/user/0/app/files/',
  '/images/',
  'avatar.txt'
);

console.log(fullPath);
// /data/user/0/app/files/images/avatar.txt
```

### `resolveReactNativeFilesystemDirectory(directory)`

Resolves a typed directory descriptor to a real path.

```ts
import {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemDirectory,
} from 'react-native-simple-fs';

async function resolveDirectory() {
  const documentsPath = await resolveReactNativeFilesystemDirectory({
    kind: ReactNativeFilesystemDirectoryKind.Documents,
  });

  const customPath = await resolveReactNativeFilesystemDirectory({
    kind: ReactNativeFilesystemDirectoryKind.Custom,
    path: '/tmp/my-folder',
  });

  console.log({ documentsPath, customPath });
}
```

### `resolveReactNativeFilesystemFilePath(directory, filename)`

Builds a file path from a directory descriptor plus a filename.

```ts
import {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';

async function resolveFilePath() {
  const filePath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'notes.txt'
  );

  console.log(filePath);
}
```

## API Reference

### `getDocumentsDirectory()`

Returns the app documents directory path.

```ts
const documentsDirectory = await ReactNativeFilesystem.getDocumentsDirectory();
```

### `exists(path)`

Checks whether a file or directory exists.

```ts
const exists = await ReactNativeFilesystem.exists(filePath);
```

### `readFile(path)`

Reads a UTF-8 text file.

```ts
const contents = await ReactNativeFilesystem.readFile(filePath);
```

### `writeFile(path, contents)`

Writes UTF-8 text to a file.

```ts
await ReactNativeFilesystem.writeFile(filePath, 'Hello from file');
```

### `downloadFile(url, destinationPath, options?)`

Downloads a remote file into a local destination path.

```ts
const result = await ReactNativeFilesystem.downloadFile(
  'https://www.w3.org/TR/PNG/iso_8859-1.txt',
  filePath,
  { mimeType: 'text/plain' }
);
```

Behavior:

- supports `http` and `https`
- creates parent directories automatically
- overwrites the destination file if it already exists
- if `destinationPath` has no extension, the module tries to infer one from `options.mimeType`, the server's suggested filename, or the response MIME type
- returns `{ path, bytesWritten, statusCode }`

### `writeFileToDownloads(filename, contents, mimeType?)`

Saves a file using the platform export flow.

```ts
const savedPath = await ReactNativeFilesystem.writeFileToDownloads(
  'export.json',
  JSON.stringify({ ok: true }, null, 2),
  'application/json'
);
```

Common MIME constants are also exported:

```ts
import {
  ReactNativeFilesystemCommonMimeTypes,
} from 'react-native-filesystem';

await ReactNativeFilesystem.writeFileToDownloads(
  'report',
  contents,
  ReactNativeFilesystemCommonMimeTypes.Pdf
);
```

### `deleteFile(path)`

Deletes a file or directory path.

```ts
await ReactNativeFilesystem.deleteFile(filePath);
```

### `mkdir(path)`

Creates a directory.

```ts
await ReactNativeFilesystem.mkdir(folderPath);
```

### `readdir(path)`

Lists entries inside a directory.

```ts
const entries = await ReactNativeFilesystem.readdir(folderPath);
```

### `stat(path)`

Returns metadata for a file or directory.

```ts
const stat = await ReactNativeFilesystem.stat(filePath);
```

### `move(from, to)`

Moves a file or directory.

```ts
await ReactNativeFilesystem.move(oldPath, newPath);
```

### `copy(from, to)`

Copies a file or directory.

```ts
await ReactNativeFilesystem.copy(sourcePath, destinationPath);
```

## Error Handling Example

```ts
import ReactNativeFilesystem, {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';

async function safeReadExample() {
  try {
    const path = await resolveReactNativeFilesystemFilePath(
      { kind: ReactNativeFilesystemDirectoryKind.Documents },
      'hello.txt'
    );

    const contents = await ReactNativeFilesystem.readFile(path);
    console.log(contents);
  } catch (error) {
    console.error('Filesystem error:', error);
  }
}
```

## Practical Tips

- use `resolveReactNativeFilesystemFilePath()` when you want a safe file path inside app storage
- use `writeFileToDownloads()` when the user should receive a visible exported file
- use `downloadFile()` when you want to save a remote file into your app storage
- only use `readFile()` for UTF-8 text files
- on web, local filesystem methods are intentionally unsupported

## Contact / Support

If you need help, want to report a bug, or want to request a feature, use one of these:

- GitHub Issues: https://github.com/tankhang1/react-native-simple-fs/issues
- Repository: https://github.com/tankhang1/react-native-simple-fs
- Author: Ethan <doank3442@gmail.com>

When opening an issue, it helps to include:

- platform: Android, iOS, or Web
- Expo SDK version
- React Native version
- a small code sample
- the exact error message

## FAQ

### Does this package work on Android and iOS?

Yes. This package is built for Android and iOS through Expo Modules.

### Does this package work on web?

The package can be imported on web, but local filesystem methods are not supported there and will throw.

### Can I download files from HTTPS?

Yes. Use `downloadFile(url, destinationPath)` to download a remote file into your app storage.

### Can I save directly to the public Downloads folder on iOS?

No. iOS does not allow silent writing to a public Downloads folder the same way Android does. On iOS, `writeFileToDownloads()` opens the Files picker so the user chooses the destination.

### Can I read images or PDFs with `readFile()`?

No. `readFile()` is designed for UTF-8 text files. For binary files like images, PDFs, videos, or zip files, do not read them as text.

### What path should I use for app-managed files?

Use `resolveReactNativeFilesystemFilePath()` together with `ReactNativeFilesystemDirectoryKind.Documents`. That is the safest default for storing files inside your app.

## Contributing

Contributions are welcome.

If you want to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Add or update tests when needed.
5. Open a pull request with a clear description.

Recommended when submitting a pull request:

- explain the problem being solved
- describe the expected behavior
- include screenshots or screen recordings if UI behavior changes
- mention platform-specific impact if relevant

Before opening a pull request, run the project checks if available:

```bash
npm test
```

```bash
npm run build
```

Repository: https://github.com/tankhang1/react-native-simple-fs

## Security

If you believe you found a security issue, please do not post sensitive details in a public issue first.

Instead:

- contact the maintainer directly at `doank3442@gmail.com`
- include steps to reproduce the issue
- explain the impact clearly
- share any temporary mitigation if you know one

Please use GitHub Issues for normal bugs and feature requests, and private contact for responsible disclosure of security-related issues.

## License

MIT

See the package metadata in [package.json](/Users/khang/Documents/Nexa/react-native-filesystem/package.json).
