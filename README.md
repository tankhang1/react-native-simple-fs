# react-native-simple-fs

[![npm version](https://img.shields.io/npm/v/react-native-simple-fs.svg)](https://www.npmjs.com/package/react-native-simple-fs)

Cross-platform filesystem module for React Native apps built with Expo Modules.

Package: https://www.npmjs.com/package/react-native-simple-fs

## What This Package Does

`react-native-simple-fs` helps you:

- read UTF-8 text files
- write UTF-8 text files
- create folders
- check whether files exist
- read directory entries
- inspect file metadata
- move, copy, and delete files
- download remote files over `http` or `https`
- write exported files to Android Downloads
- open the iOS Files export flow
- save a local image into the system photo library
- list images from the system photo library
- delete an image from the system photo library

## Compatibility

### React Native setup

| Setup | Supported | Notes |
| --- | --- | --- |
| React Native New Architecture | Yes | |
| React Native old architecture | Yes | |
| Bare React Native app | Yes | `expo` and Expo Modules must be installed |
| React Native CLI app | Yes | `expo` setup is still required |
| Expo managed app | Yes | Requires a custom native build |
| `expo run:android` | Yes | |
| `expo run:ios` | Yes | |
| EAS Build | Yes | |
| Expo Go | No | Expo Go cannot load this custom native module |

### Platform support

| Platform | Supported | Notes |
| --- | --- | --- |
| Android | Yes | Supports app storage, Downloads, and MediaStore image library |
| iOS | Yes | Supports app storage, Files export flow, and Photo Library APIs |
| Web | Import only | Local filesystem methods throw on web |

## Install

```bash
npm install react-native-simple-fs
```

Rebuild your native app after installing:

```bash
npx expo run:android
npx expo run:ios
```

### Peer dependencies

| Package | Required |
| --- | --- |
| `expo` | Yes |
| `react` | Yes |
| `react-native` | Yes |

## Import

```ts
import ReactNativeFilesystem, {
  ReactNativeFilesystemCommonMimeTypes,
  ReactNativeFilesystemDirectoryKind,
  joinReactNativeFilesystemPath,
  resolveReactNativeFilesystemDirectory,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';
```

## Quick Start

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

## Concepts

### App Documents directory

Use the app Documents directory when:

- you want full read and write control
- you want to keep files inside your app sandbox
- you want to download a file to a private local path

### Downloads / Files export flow

Use the export flow when:

- you want the user to receive a visible file outside the app
- you want Android to write into public Downloads
- you want iOS to show the Files picker

### System photo library

Use the media library APIs when:

- you want to save a local image into Photos / Gallery
- you want to list images from the system media library

## Path Helpers

### `joinReactNativeFilesystemPath(...segments)`

Joins path segments with normalized slashes.

| Parameter | Type | Description |
| --- | --- | --- |
| `...segments` | `string[]` | Path parts to join |

```ts
const path = joinReactNativeFilesystemPath('/tmp/demo', 'nested', 'file.txt');
```

### `resolveReactNativeFilesystemDirectory(directory)`

Resolves a directory descriptor into an absolute path.

| Parameter | Type | Description |
| --- | --- | --- |
| `directory` | `ReactNativeFilesystemDirectoryDescriptor` | Directory descriptor |

```ts
const documentsPath = await resolveReactNativeFilesystemDirectory({
  kind: ReactNativeFilesystemDirectoryKind.Documents,
});
```

### `resolveReactNativeFilesystemFilePath(directory, filename)`

Resolves a safe absolute file path inside a directory descriptor.

| Parameter | Type | Description |
| --- | --- | --- |
| `directory` | `ReactNativeFilesystemDirectoryDescriptor` | Base directory |
| `filename` | `string` | File name to append |

```ts
const pdfPath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'sample.pdf'
);
```

## API Summary

| Function | Purpose | Android | iOS |
| --- | --- | --- | --- |
| `getDocumentsDirectory()` | Resolve app Documents directory | Yes | Yes |
| `exists(path)` | Check whether a path exists | Yes | Yes |
| `readFile(path)` | Read a UTF-8 text file | Yes | Yes |
| `writeFile(path, contents)` | Write a UTF-8 text file | Yes | Yes |
| `downloadFile(url, destinationPath, options?)` | Download a remote file | Yes | Yes |
| `writeFileToDownloads(filename, contents, mimeType?)` | Export a file outside the app | Downloads | Files picker |
| `saveImageToLibrary(path, options?)` | Save a local image into the system photo library | Yes | Yes |
| `getImages(options?)` | List images from the system media library | Yes | Yes |
| `deleteImageFromLibrary(options)` | Delete an image from the system media library | Yes | Yes |
| `deleteFile(path)` | Delete a file or folder | Yes | Yes |
| `mkdir(path)` | Create a directory | Yes | Yes |
| `readdir(path)` | List directory entries | Yes | Yes |
| `stat(path)` | Read path metadata | Yes | Yes |
| `move(from, to)` | Move a file or directory | Yes | Yes |
| `copy(from, to)` | Copy a file or directory | Yes | Yes |

## API Reference

### `getDocumentsDirectory()`

Returns the app Documents directory as an absolute path.

| Returns | Type |
| --- | --- |
| documents path | `Promise<string>` |

```ts
const documentsPath = await ReactNativeFilesystem.getDocumentsDirectory();
```

### `exists(path)`

Checks whether a path exists.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | Yes | Absolute file path or supported URI |

| Returns | Type |
| --- | --- |
| exists | `Promise<boolean>` |

```ts
const exists = await ReactNativeFilesystem.exists(filePath);
```

### `readFile(path)`

Reads a UTF-8 text file.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | Yes | Absolute file path or supported URI |

| Returns | Type |
| --- | --- |
| file contents | `Promise<string>` |

```ts
const text = await ReactNativeFilesystem.readFile(filePath);
```

Notes:

- use this only for UTF-8 text files
- do not use this for binary files like images, PDFs, ZIPs, or videos

### `writeFile(path, contents)`

Writes UTF-8 text to a file. Parent folders are created when needed.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | Yes | Absolute destination path |
| `contents` | `string` | Yes | UTF-8 text to write |

| Returns | Type |
| --- | --- |
| nothing | `Promise<void>` |

```ts
await ReactNativeFilesystem.writeFile(filePath, 'Hello world');
```

### `downloadFile(url, destinationPath, options?)`

Downloads a remote file to a local path or platform-specific destination.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | `string` | Yes | Remote `http` or `https` URL |
| `destinationPath` | `string` | Yes | Local path or supported destination |
| `options` | `ReactNativeFilesystemDownloadOptions` | No | Download options |

#### `ReactNativeFilesystemDownloadOptions`

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `mimeType` | `string` | No | Explicit MIME type |
| `onProgressIntervalMs` | `number` | No | Progress event interval in milliseconds |
| `progressId` | `string` | No | Progress event correlation id |
| `saveToDownloads` | `boolean` | No | Android only, write directly to Downloads |

#### Return value

| Property | Type | Description |
| --- | --- | --- |
| `path` | `string` | Final saved path or URI |
| `bytesWritten` | `number` | Number of bytes written |
| `statusCode` | `number` | HTTP status code |

```ts
const destinationPath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'sample.pdf'
);

const result = await ReactNativeFilesystem.downloadFile(
  'https://pdfobject.com/pdf/sample.pdf',
  destinationPath,
  {
    mimeType: ReactNativeFilesystemCommonMimeTypes.Pdf,
    onProgressIntervalMs: 150,
    progressId: 'sample-pdf',
  }
);

console.log(result);
```

### `writeFileToDownloads(filename, contents, mimeType?)`

Exports a file outside the app.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `filename` | `string` | Yes | Output file name |
| `contents` | `string` | Yes | UTF-8 text contents |
| `mimeType` | `string` | No | MIME type |

| Returns | Type | Description |
| --- | --- | --- |
| saved path | `Promise<string>` | Android URI/path or iOS export result |

```ts
const savedPath = await ReactNativeFilesystem.writeFileToDownloads(
  'report.json',
  JSON.stringify({ ok: true }, null, 2),
  ReactNativeFilesystemCommonMimeTypes.Json
);
```

Platform notes:

- Android writes directly to public Downloads
- iOS opens the Files picker so the user chooses the destination

### `saveImageToLibrary(path, options?)`

Saves a local image file into the system photo library.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | Yes | Local image file path. Android also supports `content://` |
| `options` | `ReactNativeFilesystemSaveImageOptions` | No | Save options |

#### `ReactNativeFilesystemSaveImageOptions`

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `filename` | `string` | No | Override output file name when supported |
| `mimeType` | `string` | No | Explicit MIME type |

#### Return value: `ReactNativeFilesystemImageAsset`

| Property | Type | Description |
| --- | --- | --- |
| `id` | `string` | Native asset id |
| `uri` | `string` | Primary asset URI |
| `previewUri` | `string \| null` | Optional preview-friendly URI |
| `filename` | `string \| null` | File name |
| `width` | `number \| null` | Image width |
| `height` | `number \| null` | Image height |
| `mimeType` | `string \| null` | MIME type |
| `size` | `number \| null` | File size in bytes |
| `creationTime` | `number \| null` | Unix timestamp in seconds |
| `modificationTime` | `number \| null` | Unix timestamp in seconds |

```ts
const localImagePath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'example-image.png'
);

await ReactNativeFilesystem.downloadFile(
  'https://i.pinimg.com/736x/b3/bc/45/b3bc459af204f37a4bdd78f991d5e6cf.jpg',
  localImagePath,
  { mimeType: ReactNativeFilesystemCommonMimeTypes.Jpeg }
);

const asset = await ReactNativeFilesystem.saveImageToLibrary(localImagePath, {
  mimeType: ReactNativeFilesystemCommonMimeTypes.Jpeg,
});
```

### `getImages(options?)`

Lists images from the system media library.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `ReactNativeFilesystemGetImagesOptions` | No | Query options |

#### `ReactNativeFilesystemGetImagesOptions`

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | `number` | No | Maximum number of images to return |

| Returns | Type |
| --- | --- |
| images | `Promise<ReactNativeFilesystemImageAsset[]>` |

```ts
const images = await ReactNativeFilesystem.getImages({ limit: 20 });
```

### `deleteImageFromLibrary(options)`

Deletes an image from the system media library.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `ReactNativeFilesystemDeleteImageOptions` | Yes | Delete options |

#### `ReactNativeFilesystemDeleteImageOptions`

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `asset` | `ReactNativeFilesystemImageAsset` | Yes | Asset returned by `saveImageToLibrary()` or `getImages()` |

| Returns | Type |
| --- | --- |
| nothing | `Promise<void>` |

```ts
const images = await ReactNativeFilesystem.getImages({ limit: 20 });

if (images[0]) {
  await ReactNativeFilesystem.deleteImageFromLibrary({ asset: images[0] });
}
```

### `deleteFile(path)`

Deletes a file or directory path.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | Yes | Path to delete |

| Returns | Type |
| --- | --- |
| nothing | `Promise<void>` |

```ts
await ReactNativeFilesystem.deleteFile(filePath);
```

### `mkdir(path)`

Creates a directory and missing parent folders.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | Yes | Directory path |

| Returns | Type |
| --- | --- |
| nothing | `Promise<void>` |

```ts
await ReactNativeFilesystem.mkdir(folderPath);
```

### `readdir(path)`

Lists directory entries.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | Yes | Directory path |

| Returns | Type |
| --- | --- |
| entries | `Promise<string[]>` |

```ts
const entries = await ReactNativeFilesystem.readdir(folderPath);
```

### `stat(path)`

Returns metadata for a file or directory.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | `string` | Yes | Path to inspect |

#### Return value: `ReactNativeFilesystemStat`

| Property | Type | Description |
| --- | --- | --- |
| `path` | `string` | Original path |
| `exists` | `boolean` | Whether the path exists |
| `isFile` | `boolean` | Whether the path is a file |
| `isDirectory` | `boolean` | Whether the path is a directory |
| `size` | `number` | Size in bytes |
| `modificationTime` | `number \| null` | Unix timestamp in seconds |

```ts
const stat = await ReactNativeFilesystem.stat(filePath);
```

### `move(from, to)`

Moves a file or directory.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | `string` | Yes | Source path |
| `to` | `string` | Yes | Destination path |

| Returns | Type |
| --- | --- |
| nothing | `Promise<void>` |

```ts
await ReactNativeFilesystem.move(oldPath, newPath);
```

### `copy(from, to)`

Copies a file or directory.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | `string` | Yes | Source path |
| `to` | `string` | Yes | Destination path |

| Returns | Type |
| --- | --- |
| nothing | `Promise<void>` |

```ts
await ReactNativeFilesystem.copy(sourcePath, destinationPath);
```

## Events

### `downloadProgress`

The native module emits `downloadProgress` during `downloadFile(...)`.

#### Event shape: `ReactNativeFilesystemDownloadProgressEvent`

| Property | Type | Description |
| --- | --- | --- |
| `bytesWritten` | `number` | Bytes written so far |
| `contentLength` | `number \| null` | Total content length if known |
| `destinationPath` | `string` | Destination path or URI |
| `progress` | `number \| null` | `0..1` if known |
| `progressId` | `string \| null` | Caller-provided progress id |
| `url` | `string` | Download URL |

```ts
const subscription = (ReactNativeFilesystem as any).addListener(
  'downloadProgress',
  (event) => {
    console.log(event.progress, event.destinationPath);
  }
);

const destinationPath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'sample.pdf'
);

await ReactNativeFilesystem.downloadFile(
  'https://pdfobject.com/pdf/sample.pdf',
  destinationPath,
  {
    progressId: 'sample-pdf',
    onProgressIntervalMs: 100,
  }
);

subscription.remove();
```

## MIME Type Helpers

The package exports common MIME type constants:

```ts
ReactNativeFilesystemCommonMimeTypes.Csv
ReactNativeFilesystemCommonMimeTypes.Gif
ReactNativeFilesystemCommonMimeTypes.Html
ReactNativeFilesystemCommonMimeTypes.Jpeg
ReactNativeFilesystemCommonMimeTypes.Json
ReactNativeFilesystemCommonMimeTypes.Pdf
ReactNativeFilesystemCommonMimeTypes.Png
ReactNativeFilesystemCommonMimeTypes.Text
ReactNativeFilesystemCommonMimeTypes.Webp
ReactNativeFilesystemCommonMimeTypes.Xml
ReactNativeFilesystemCommonMimeTypes.Zip
```

Example:

```ts
await ReactNativeFilesystem.downloadFile(url, destinationPath, {
  mimeType: ReactNativeFilesystemCommonMimeTypes.Pdf,
});
```

## End-to-End Examples

### Example: download a PDF to app storage

```ts
async function downloadPdfExample() {
  const destinationPath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'sample.pdf'
  );

  const result = await ReactNativeFilesystem.downloadFile(
    'https://pdfobject.com/pdf/sample.pdf',
    destinationPath,
    { mimeType: ReactNativeFilesystemCommonMimeTypes.Pdf }
  );

  return result;
}
```

### Example: write and export JSON

```ts
async function exportJsonExample() {
  const path = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'report.json'
  );

  await ReactNativeFilesystem.writeFile(
    path,
    JSON.stringify({ ok: true }, null, 2)
  );

  return ReactNativeFilesystem.writeFileToDownloads(
    'report.json',
    await ReactNativeFilesystem.readFile(path),
    ReactNativeFilesystemCommonMimeTypes.Json
  );
}
```

### Example: save an image to the system photo library

```ts
async function saveImageExample() {
  const localImagePath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'example-image.jpg'
  );

  await ReactNativeFilesystem.downloadFile(
    'https://i.pinimg.com/736x/b3/bc/45/b3bc459af204f37a4bdd78f991d5e6cf.jpg',
    localImagePath,
    { mimeType: ReactNativeFilesystemCommonMimeTypes.Jpeg }
  );

  const savedAsset = await ReactNativeFilesystem.saveImageToLibrary(localImagePath, {
    mimeType: ReactNativeFilesystemCommonMimeTypes.Jpeg,
  });

  const recentImages = await ReactNativeFilesystem.getImages({ limit: 12 });

  return { savedAsset, recentImages };
}
```

## Permissions

### Android

`getImages()` and `deleteImageFromLibrary()` require media library access.

| Android version | Permission |
| --- | --- |
| Android 13+ | `READ_MEDIA_IMAGES` |
| Android 12 and below | `READ_EXTERNAL_STORAGE` |

Older Android public storage writes may also require legacy storage permissions.
On Android 10 and above, deleting shared media may trigger a system confirmation dialog.

### iOS

Your app must include these `Info.plist` keys:

| Key | Needed for |
| --- | --- |
| `NSPhotoLibraryUsageDescription` | `getImages()`, `deleteImageFromLibrary()` |
| `NSPhotoLibraryAddUsageDescription` | `saveImageToLibrary()` |

## Web behavior

On web, the package can be imported, but local filesystem methods are not supported and will throw.

## Error handling

```ts
async function safeRead(path: string) {
  try {
    return await ReactNativeFilesystem.readFile(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Filesystem error:', message);
    return null;
  }
}
```

## AI-friendly Summary

Use this package when you need native filesystem helpers in a React Native app with Expo Modules.

Key behaviors:

- `readFile()` and `writeFile()` are text-oriented APIs
- `downloadFile()` saves a remote `http` or `https` file to a destination path
- `writeFileToDownloads()` exports a visible file outside the app
- `saveImageToLibrary()` takes a local image path and saves it into Photos / Gallery
- `getImages()` reads from the system media library
- `resolveReactNativeFilesystemFilePath(...)` is the safest way to build a valid app-local destination path
- web imports are allowed, but native filesystem methods throw

Recommended default pattern:

```ts
const path = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'file.txt'
);
```
