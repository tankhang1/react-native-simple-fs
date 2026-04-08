import ReactNativeFilesystem from './ReactNativeFilesystemModule';
import {
  ReactNativeFilesystemDirectoryDescriptor,
  ReactNativeFilesystemDirectoryKind,
} from './ReactNativeFilesystem.types';

export function joinReactNativeFilesystemPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) {
        return segment.replace(/\/+$/, '');
      }
      return segment.replace(/^\/+|\/+$/g, '');
    })
    .join('/');
}

export async function resolveReactNativeFilesystemDirectory(
  directory: ReactNativeFilesystemDirectoryDescriptor
): Promise<string> {
  switch (directory.kind) {
    case ReactNativeFilesystemDirectoryKind.Documents:
      return (await ReactNativeFilesystem.getDocumentsDirectory()).replace(/\/+$/, '');
    case ReactNativeFilesystemDirectoryKind.Custom:
      return directory.path.replace(/\/+$/, '');
  }
}

export async function resolveReactNativeFilesystemFilePath(
  directory: ReactNativeFilesystemDirectoryDescriptor,
  filename: string
): Promise<string> {
  const basePath = await resolveReactNativeFilesystemDirectory(directory);
  return joinReactNativeFilesystemPath(basePath, filename);
}
