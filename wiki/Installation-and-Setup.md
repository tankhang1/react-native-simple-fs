# Installation and Setup

This page explains how to add `react-native-simple-fs` to a React Native project and what kind of app setup is required.

## Requirements

`react-native-simple-fs` is a native module built with Expo Modules.

Your project needs:

- `expo`
- `react`
- `react-native`

It works in:

- bare React Native projects
- React Native CLI apps with Expo Modules installed
- Expo managed apps that use a custom native build
- EAS Build

It does not work in:

- Expo Go

## Install

```bash
npm install react-native-simple-fs
```

## Rebuild the native app

Because this package contains native iOS and Android code, you need to rebuild after installation.

```bash
npx expo run:android
npx expo run:ios
```

If you use EAS Build, commit the dependency change and create a new native build.

## Import the package

```ts
import ReactNativeFilesystem, {
  ReactNativeFilesystemCommonMimeTypes,
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';
```

## First working example

```ts
import ReactNativeFilesystem, {
  ReactNativeFilesystemDirectoryKind,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-simple-fs';

async function firstExample() {
  const filePath = await resolveReactNativeFilesystemFilePath(
    { kind: ReactNativeFilesystemDirectoryKind.Documents },
    'hello.txt'
  );

  await ReactNativeFilesystem.writeFile(filePath, 'Hello from React Native');
  return ReactNativeFilesystem.readFile(filePath);
}
```

## Recommended development flow

1. Start with the app Documents directory.
2. Use `resolveReactNativeFilesystemFilePath(...)` to build paths safely.
3. Use `writeFile()` and `readFile()` for text files.
4. Add export, download, or photo library features only after the base file flow works.

## Related pages

- `Home`
- `API-Reference`
- `Permissions`
- `Troubleshooting`
