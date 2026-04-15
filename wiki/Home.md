# Home

Welcome to the `react-native-simple-fs` wiki.

`react-native-simple-fs` is a cross-platform filesystem module for React Native apps built with Expo Modules. It gives you a small, practical API for working with app-local files, exporting files outside the app, downloading remote files, and interacting with the system photo library on iOS and Android.

Package links:

- npm: https://www.npmjs.com/package/react-native-simple-fs
- repository: https://github.com/tankhang1/react-native-simple-fs

## What This Package Does

Use `react-native-simple-fs` when your app needs to:

- read UTF-8 text files
- write UTF-8 text files
- read files as `base64`
- write files from `base64`
- append UTF-8 text files
- create folders
- check whether files exist
- inspect file metadata
- read directory entries
- move, copy, and delete files
- download remote files over `http` or `https`
- export a file to Android Downloads or the iOS Files flow
- save a local image into Photos or Gallery
- list images from the system media library
- delete an image from the system media library

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
| Android | Yes | App storage, Downloads, and MediaStore image library |
| iOS | Yes | App storage, Files export flow, and Photo Library APIs |
| Web | Import only | Native filesystem methods throw on web |

## Install

```bash
npm install react-native-simple-fs
```

After installing, rebuild your native app:

```bash
npx expo run:android
npx expo run:ios
```

Peer dependencies:

- `expo`
- `react`
- `react-native`

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

## Core Concepts

### 1. App Documents directory

Use the app Documents directory when:

- you want full read and write control
- you want files to stay inside your app sandbox
- you want a predictable local destination for downloads

Recommended pattern:

```ts
const path = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'file.txt'
);
```

### 2. Export flow

Use the export flow when:

- you want the user to receive a visible file outside the app
- you want Android to write to public Downloads
- you want iOS to show the Files picker

```ts
await ReactNativeFilesystem.writeFileToDownloads(
  'report.json',
  JSON.stringify({ ok: true }, null, 2),
  ReactNativeFilesystemCommonMimeTypes.Json
);
```

Platform behavior:

- Android writes directly to Downloads
- iOS opens the Files picker so the user chooses where to save

### 3. Photo library workflows

Use the media library APIs when:

- you want to save a local image into Photos or Gallery
- you want to show recent images from the device
- you want to delete an image previously returned by the API

```ts
const savedAsset = await ReactNativeFilesystem.saveImageToLibrary(localImagePath, {
  mimeType: ReactNativeFilesystemCommonMimeTypes.Jpeg,
});

const recentImages = await ReactNativeFilesystem.getImages({ limit: 12 });
```

## Main API Surface

| Function | Purpose |
| --- | --- |
| `getDocumentsDirectory()` | Resolve app Documents directory |
| `exists(path)` | Check whether a path exists |
| `readFile(path, encoding?)` | Read a UTF-8 text file or `base64` data |
| `writeFile(path, contents, encoding?)` | Write a UTF-8 text file or `base64` data |
| `appendFile(path, contents)` | Append UTF-8 text to a file |
| `downloadFile(url, destinationPath, options?)` | Download a remote file |
| `writeFileToDownloads(filename, contents, mimeType?)` | Export a file outside the app |
| `saveImageToLibrary(path, options?)` | Save a local image into the system photo library |
| `getImages(options?)` | List images from the system media library |
| `deleteImageFromLibrary(options)` | Delete an image from the system media library |
| `deleteFile(path)` | Delete a file or folder |
| `mkdir(path)` | Create a directory |
| `readdir(path)` | List directory entries |
| `stat(path)` | Read path metadata |
| `move(from, to)` | Move a file or directory |
| `copy(from, to)` | Copy a file or directory |

## Path Helpers

### `joinReactNativeFilesystemPath(...segments)`

Joins path segments using normalized slashes.

```ts
const path = joinReactNativeFilesystemPath('/tmp/demo', 'nested', 'file.txt');
```

### `resolveReactNativeFilesystemDirectory(directory)`

Resolves a directory descriptor into an absolute path.

```ts
const documentsPath = await resolveReactNativeFilesystemDirectory({
  kind: ReactNativeFilesystemDirectoryKind.Documents,
});
```

### `resolveReactNativeFilesystemFilePath(directory, filename)`

Builds a safe absolute file path inside a directory descriptor.

```ts
const pdfPath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'sample.pdf'
);
```

## Download Progress Events

The native module emits `downloadProgress` during `downloadFile(...)`.

```ts
const subscription = (ReactNativeFilesystem as any).addListener(
  'downloadProgress',
  (event) => {
    console.log(event.progress, event.destinationPath);
  }
);

await ReactNativeFilesystem.downloadFile(url, destinationPath, {
  progressId: 'sample-download',
  onProgressIntervalMs: 100,
});

subscription.remove();
```

Event fields:

- `bytesWritten`
- `contentLength`
- `destinationPath`
- `progress`
- `progressId`
- `url`

## Permissions

### Android

`getImages()` and `deleteImageFromLibrary()` require media library access.

| Android version | Permission |
| --- | --- |
| Android 13+ | `READ_MEDIA_IMAGES` |
| Android 12 and below | `READ_EXTERNAL_STORAGE` |

Notes:

- older Android public storage writes may require legacy storage permissions
- deleting shared media may trigger a system confirmation dialog

### iOS

Add these keys to `Info.plist` when using photo library APIs:

| Key | Needed for |
| --- | --- |
| `NSPhotoLibraryUsageDescription` | `getImages()`, `deleteImageFromLibrary()` |
| `NSPhotoLibraryAddUsageDescription` | `saveImageToLibrary()` |

## Web Behavior

On web, the package can be imported, but native filesystem methods are not supported and will throw.

## Common Usage Patterns

### Download a PDF into app storage

```ts
async function downloadPdfExample() {
  const destinationPath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'sample.pdf'
  );

  return ReactNativeFilesystem.downloadFile(
    'https://pdfobject.com/pdf/sample.pdf',
    destinationPath,
    { mimeType: ReactNativeFilesystemCommonMimeTypes.Pdf }
  );
}
```

### Write and export JSON

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

### Save an image to the system photo library

```ts
async function saveImageExample() {
  const localImagePath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'example-image.jpg'
  );

  await ReactNativeFilesystem.downloadFile(
    'https://example.com/example-image.jpg',
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

## Best Practices

- use `resolveReactNativeFilesystemFilePath(...)` to build app-local paths safely
- use `readFile()` and `writeFile()` for UTF-8 text, not binary files
- use `appendFile()` for logs, incremental exports, and simple cache updates
- use the app Documents directory as the default working area
- use `writeFileToDownloads()` when the user needs a visible exported file
- handle permission prompts before calling photo library APIs
- treat web as import-only for now

## Related Pages

Suggested wiki pages to add next:

- `Installation-and-Setup`
- `API-Reference`
- `Examples`
- `Permissions`
- `Troubleshooting`
