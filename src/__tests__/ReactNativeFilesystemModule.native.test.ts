import { expect, jest, test } from '@jest/globals';
import { requireNativeModule } from 'expo';

const mockedNativeModule = {
  PI: Math.PI,
  hello: jest.fn(() => 'Hello world! 👋'),
  setValueAsync: jest.fn(),
  getDocumentsDirectory: jest.fn(),
  exists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  writeFileToDownloads: jest.fn(),
  deleteFile: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  move: jest.fn(),
  copy: jest.fn(),
};

jest.mock('expo', () => ({
  NativeModule: class MockNativeModule {},
  requireNativeModule: jest.fn(() => mockedNativeModule),
}));

import ReactNativeFilesystemModule from '../ReactNativeFilesystemModule';

test('loads the native ReactNativeFilesystem module through Expo', () => {
  expect(requireNativeModule).toHaveBeenCalledWith('ReactNativeFilesystem');
  expect(ReactNativeFilesystemModule).toBe(mockedNativeModule);
});
