# react-native-filesystem

A cross-platform Expo module for React Native. This package is currently in an early stage and ships the native module scaffold for iOS and Android, along with a native `WebView`-backed view example.

The repository is set up as an Expo module library, so it is ready to evolve into a fuller filesystem package for reading, writing, and managing files across platforms.

## Features

- Expo module structure for iOS, Android, and web
- Native module bridge with constants, sync methods, async methods, and events
- Native view component exposed to JavaScript
- TypeScript entrypoints and generated build output

## Current API

Right now, the library exposes:

- `PI`: a native constant
- `hello()`: a synchronous native function
- `setValueAsync(value)`: an async native function that emits an `onChange` event
- `ReactNativeFilesystemView`: a native view that loads a URL and emits `onLoad`

If you are planning to use this package as a real filesystem library, treat the current release as a foundation rather than a finished API.

## Installation

Install the package in your React Native or Expo project:

```bash
npm install react-native-filesystem
```

If your app uses Expo modules already, the native code should autolink during native build steps.

## Usage

```tsx
import { useEvent } from 'expo';
import ReactNativeFilesystem, {
  ReactNativeFilesystemView,
} from 'react-native-filesystem';
import { Button, Text, View } from 'react-native';

export default function ExampleScreen() {
  const onChangePayload = useEvent(ReactNativeFilesystem, 'onChange');

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text>PI: {ReactNativeFilesystem.PI}</Text>
      <Text>{ReactNativeFilesystem.hello()}</Text>
      <Text>Latest event value: {onChangePayload?.value ?? 'none'}</Text>

      <Button
        title="Send value to native module"
        onPress={() => ReactNativeFilesystem.setValueAsync('Hello from JS!')}
      />

      <ReactNativeFilesystemView
        url="https://www.example.com"
        onLoad={({ nativeEvent }) => {
          console.log('Loaded URL:', nativeEvent.url);
        }}
        style={{ flex: 1, minHeight: 240, marginTop: 16 }}
      />
    </View>
  );
}
```

## API Reference

### Module

#### `ReactNativeFilesystem.PI`

Returns the native value of `Math.PI`.

#### `ReactNativeFilesystem.hello(): string`

Returns a simple native greeting string.

#### `ReactNativeFilesystem.setValueAsync(value: string): Promise<void>`

Sends a string to the native module and emits the `onChange` event with:

```ts
type ChangeEventPayload = {
  value: string;
};
```

### Events

Subscribe with Expo's `useEvent` helper:

```tsx
const onChangePayload = useEvent(ReactNativeFilesystem, 'onChange');
```

### View

#### `<ReactNativeFilesystemView />`

Props:

```ts
type ReactNativeFilesystemViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: { url: string } }) => void;
  style?: StyleProp<ViewStyle>;
};
```

The native view loads the provided URL and fires `onLoad` when navigation finishes.

## Local Development

Build the library:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Open the example app:

```bash
npm run open:ios
```

```bash
npm run open:android
```

## Project Structure

```text
src/        JavaScript and TypeScript entrypoints
ios/        iOS native module and view implementation
android/    Android native module and view implementation
example/    Example app for manual testing
```

## Roadmap

Planned improvements for the library may include:

- File read and write operations
- Directory listing and metadata access
- File existence and deletion helpers
- Better web support
- A more complete typed filesystem API

## License

MIT
