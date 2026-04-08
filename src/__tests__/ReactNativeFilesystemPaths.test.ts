import { describe, expect, it, jest } from '@jest/globals';

const mockNativeModule = {
  getDocumentsDirectory: jest.fn(async () => '/data/user/0/example/files/'),
};

jest.mock('../ReactNativeFilesystemModule', () => ({
  __esModule: true,
  default: mockNativeModule,
}));

import {
  joinReactNativeFilesystemPath,
  resolveReactNativeFilesystemDirectory,
  resolveReactNativeFilesystemFilePath,
} from '../ReactNativeFilesystemPaths';
import { ReactNativeFilesystemDirectoryKind } from '../ReactNativeFilesystem.types';

describe('ReactNativeFilesystemPaths', () => {
  it('joins path segments without duplicate separators', () => {
    expect(joinReactNativeFilesystemPath('/tmp/root/', '/child/', 'file.txt')).toBe(
      '/tmp/root/child/file.txt',
    );
  });

  it('resolves the documents directory through the native module', async () => {
    await expect(
      resolveReactNativeFilesystemDirectory({
        kind: ReactNativeFilesystemDirectoryKind.Documents,
      }),
    ).resolves.toBe('/data/user/0/example/files');
    expect(mockNativeModule.getDocumentsDirectory).toHaveBeenCalled();
  });

  it('resolves a custom directory path directly', async () => {
    await expect(
      resolveReactNativeFilesystemDirectory({
        kind: ReactNativeFilesystemDirectoryKind.Custom,
        path: '/tmp/custom/',
      }),
    ).resolves.toBe('/tmp/custom');
  });

  it('builds a file path from a directory descriptor', async () => {
    await expect(
      resolveReactNativeFilesystemFilePath(
        {
          kind: ReactNativeFilesystemDirectoryKind.Custom,
          path: '/tmp/custom',
        },
        'demo.txt',
      ),
    ).resolves.toBe('/tmp/custom/demo.txt');
  });
});
