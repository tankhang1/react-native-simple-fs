import { NativeModule, requireNativeModule } from 'expo';

import {
  ReactNativeFilesystemDownloadResult,
  ReactNativeFilesystemModuleEvents,
  ReactNativeFilesystemStat,
} from './ReactNativeFilesystem.types';

declare class ReactNativeFilesystemModule extends NativeModule<ReactNativeFilesystemModuleEvents> {
  getDocumentsDirectory(): Promise<string>;
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
  downloadFile(url: string, destinationPath: string): Promise<ReactNativeFilesystemDownloadResult>;
  writeFileToDownloads(filename: string, contents: string, mimeType?: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<ReactNativeFilesystemStat>;
  move(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ReactNativeFilesystemModule>('ReactNativeFilesystem');
