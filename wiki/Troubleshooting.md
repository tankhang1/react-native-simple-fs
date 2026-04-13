# Troubleshooting

This page covers common issues when integrating `react-native-simple-fs`.

## The module imports, but methods fail at runtime

Check whether you are running inside Expo Go.

`react-native-simple-fs` is a custom native module, so it requires a custom native build. Use:

```bash
npx expo run:android
npx expo run:ios
```

or build with EAS.

## Filesystem methods throw on web

This is expected.

The package supports web import compatibility, but native filesystem methods are not implemented on web.

## `readFile()` returns the wrong result for binary files

`readFile()` is designed for UTF-8 text.

Do not use it for:

- images
- ZIP files
- PDFs
- videos

Use download or native file handling flows for binary content instead.

## `getImages()` or `deleteImageFromLibrary()` fails

Check permissions first.

- Android 13+ needs `READ_MEDIA_IMAGES`
- older Android versions use `READ_EXTERNAL_STORAGE`
- iOS needs `NSPhotoLibraryUsageDescription`

Also make sure the user granted access.

## `saveImageToLibrary()` fails on iOS

Make sure:

- the source is a local file path
- the file exists
- `NSPhotoLibraryAddUsageDescription` is present

## `saveToDownloads` does not work on iOS

This is expected.

`saveToDownloads` is Android-only. On iOS, use `writeFileToDownloads()` to open the Files export flow.

## A downloaded file is not visible in the Files or Downloads app

Check where you saved it.

- if you saved into the app Documents directory, it stays inside the app sandbox
- if you want a user-visible export, use `writeFileToDownloads()`
- on Android, `downloadFile(..., { saveToDownloads: true })` is the public-downloads style flow

## Path problems

Use the built-in path helpers instead of manually concatenating strings:

```ts
const path = await resolveReactNativeFilesystemFilePath(
  { kind: ReactNativeFilesystemDirectoryKind.Documents },
  'file.txt'
);
```

## Native config changed, but behavior did not

Rebuild the native app after:

- installing the package
- changing permissions
- editing native project configuration
