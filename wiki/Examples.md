# Examples

This page collects a few practical usage patterns for `react-native-simple-fs`.

## Write and read a text file

```ts
import ReactNativeFilesystem, {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';

async function writeAndReadText() {
  const filePath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'notes.txt'
  );

  await ReactNativeFilesystem.writeFile(filePath, 'Hello from the app');
  return ReactNativeFilesystem.readFile(filePath);
}
```

## Create a folder and inspect its contents

```ts
async function directoryExample() {
  const folderPath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'workspace'
  );

  await ReactNativeFilesystem.mkdir(folderPath);
  const entries = await ReactNativeFilesystem.readdir(folderPath);
  const info = await ReactNativeFilesystem.stat(folderPath);

  return { entries, info };
}
```

## Download a PDF into app storage

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

## Show download progress

```ts
async function downloadWithProgress(url: string, destinationPath: string) {
  const subscription = (ReactNativeFilesystem as any).addListener(
    'downloadProgress',
    (event) => {
      console.log('progress', event.progress);
    }
  );

  try {
    return await ReactNativeFilesystem.downloadFile(url, destinationPath, {
      progressId: 'demo-download',
      onProgressIntervalMs: 100,
    });
  } finally {
    subscription.remove();
  }
}
```

## Export JSON outside the app

```ts
async function exportJsonExample() {
  return ReactNativeFilesystem.writeFileToDownloads(
    'report.json',
    JSON.stringify({ ok: true }, null, 2),
    ReactNativeFilesystemCommonMimeTypes.Json
  );
}
```

## Save an image to the device photo library

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

  return ReactNativeFilesystem.saveImageToLibrary(localImagePath, {
    mimeType: ReactNativeFilesystemCommonMimeTypes.Jpeg,
  });
}
```

## Load recent images

```ts
async function recentImagesExample() {
  return ReactNativeFilesystem.getImages({ limit: 12 });
}
```

## Delete an image from the library

```ts
async function deleteFirstImageExample() {
  const images = await ReactNativeFilesystem.getImages({ limit: 20 });

  if (!images[0]) {
    return false;
  }

  await ReactNativeFilesystem.deleteImageFromLibrary({ asset: images[0] });
  return true;
}
```
