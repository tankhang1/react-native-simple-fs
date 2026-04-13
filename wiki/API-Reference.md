# API Reference

This page is a quick reference for the public API exposed by `react-native-simple-fs`.

## Main module

### `getDocumentsDirectory()`

Returns the app Documents directory as an absolute path.

```ts
const documentsPath = await ReactNativeFilesystem.getDocumentsDirectory();
```

### `exists(path)`

Checks whether a path exists.

```ts
const exists = await ReactNativeFilesystem.exists(filePath);
```

### `readFile(path)`

Reads a UTF-8 text file.

```ts
const text = await ReactNativeFilesystem.readFile(filePath);
```

Use this for text files only. Do not use it for binary data like images, ZIP files, or PDFs.

### `writeFile(path, contents)`

Writes UTF-8 text to a file. Parent folders are created automatically.

```ts
await ReactNativeFilesystem.writeFile(filePath, 'Hello world');
```

### `downloadFile(url, destinationPath, options?)`

Downloads a remote `http` or `https` file.

```ts
const result = await ReactNativeFilesystem.downloadFile(
  'https://pdfobject.com/pdf/sample.pdf',
  destinationPath,
  {
    mimeType: ReactNativeFilesystemCommonMimeTypes.Pdf,
    onProgressIntervalMs: 150,
    progressId: 'sample-pdf',
  }
);
```

Return value:

- `path`
- `bytesWritten`
- `statusCode`

Options:

- `mimeType`
- `onProgressIntervalMs`
- `progressId`
- `saveToDownloads`

Note: `saveToDownloads` is Android-only.

### `writeFileToDownloads(filename, contents, mimeType?)`

Exports a file outside the app.

```ts
const savedPath = await ReactNativeFilesystem.writeFileToDownloads(
  'report.json',
  JSON.stringify({ ok: true }, null, 2),
  ReactNativeFilesystemCommonMimeTypes.Json
);
```

Platform behavior:

- Android writes to public Downloads
- iOS opens the Files picker

### `saveImageToLibrary(path, options?)`

Saves a local image file into the system photo library.

```ts
const asset = await ReactNativeFilesystem.saveImageToLibrary(localImagePath, {
  mimeType: ReactNativeFilesystemCommonMimeTypes.Jpeg,
});
```

### `getImages(options?)`

Returns recent images from the system media library.

```ts
const images = await ReactNativeFilesystem.getImages({ limit: 20 });
```

### `deleteImageFromLibrary(options)`

Deletes an image returned by `saveImageToLibrary()` or `getImages()`.

```ts
await ReactNativeFilesystem.deleteImageFromLibrary({ asset: images[0] });
```

### `deleteFile(path)`

Deletes a file or directory path.

```ts
await ReactNativeFilesystem.deleteFile(filePath);
```

### `mkdir(path)`

Creates a directory and missing parent folders.

```ts
await ReactNativeFilesystem.mkdir(folderPath);
```

### `readdir(path)`

Lists directory entries.

```ts
const entries = await ReactNativeFilesystem.readdir(folderPath);
```

### `stat(path)`

Returns metadata for a file or directory.

```ts
const stat = await ReactNativeFilesystem.stat(filePath);
```

Returned fields:

- `path`
- `exists`
- `isFile`
- `isDirectory`
- `size`
- `modificationTime`

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

## Path helpers

### `joinReactNativeFilesystemPath(...segments)`

```ts
const path = joinReactNativeFilesystemPath('/tmp/demo', 'nested', 'file.txt');
```

### `resolveReactNativeFilesystemDirectory(directory)`

```ts
const documentsPath = await resolveReactNativeFilesystemDirectory({
  kind: ReactNativeFilesystemDirectoryKind.Documents,
});
```

### `resolveReactNativeFilesystemFilePath(directory, filename)`

```ts
const filePath = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'hello.txt'
);
```

## Events

### `downloadProgress`

`downloadFile(...)` emits `downloadProgress` events during downloads.

```ts
const subscription = (ReactNativeFilesystem as any).addListener(
  'downloadProgress',
  (event) => {
    console.log(event.progress, event.destinationPath);
  }
);
```

Event fields:

- `bytesWritten`
- `contentLength`
- `destinationPath`
- `progress`
- `progressId`
- `url`
