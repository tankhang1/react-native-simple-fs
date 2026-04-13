# Permissions

This page lists the permissions and native configuration needed for photo library features in `react-native-simple-fs`.

## Android

The package declares media-reading permissions in `AndroidManifest.xml`.

Media library reads require:

| Android version | Permission |
| --- | --- |
| Android 13+ | `READ_MEDIA_IMAGES` |
| Android 12 and below | `READ_EXTERNAL_STORAGE` |

Notes:

- `getImages()` requires read access to the device image library
- `deleteImageFromLibrary()` also requires media library access
- older Android storage behavior may still involve legacy storage permissions
- deleting shared media on modern Android can show a system confirmation dialog

## iOS

Photo library APIs require usage description keys in your app `Info.plist`.

| Key | Needed for |
| --- | --- |
| `NSPhotoLibraryUsageDescription` | `getImages()`, `deleteImageFromLibrary()` |
| `NSPhotoLibraryAddUsageDescription` | `saveImageToLibrary()` |

Typical example values:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to browse and remove saved images.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>This app saves exported images to your photo library.</string>
```

## What does not need extra permission

These app-sandbox operations generally do not need photo library permissions:

- `getDocumentsDirectory()`
- `exists(path)`
- `readFile(path)`
- `writeFile(path, contents)`
- `mkdir(path)`
- `readdir(path)`
- `stat(path)`
- `move(from, to)`
- `copy(from, to)`
- `deleteFile(path)`

## Export behavior

`writeFileToDownloads()` behaves differently by platform:

- Android writes to public Downloads
- iOS opens the Files picker

That means the permission story for exported files is different from the photo library APIs.

## Troubleshooting permission errors

If a photo library method fails:

1. Confirm the correct native permission key exists.
2. Rebuild the app after native configuration changes.
3. Make sure the user granted access in the OS prompt or Settings.
4. Test on a real device if simulator behavior is unclear.
