import { registerWebModule, NativeModule } from 'expo';

import {
  ReactNativeFilesystemDownloadOptions,
  ReactNativeFilesystemDownloadResult,
  ReactNativeFilesystemModuleEvents,
  ReactNativeFilesystemStat,
} from './ReactNativeFilesystem.types';

function unsupported(): never {
  throw new Error(
    'react-native-filesystem does not currently support direct local filesystem access on web.'
  );
}

class ReactNativeFilesystemModule extends NativeModule<ReactNativeFilesystemModuleEvents> {
  async getDocumentsDirectory(): Promise<string> {
    unsupported();
  }
  async exists(_path: string): Promise<boolean> {
    unsupported();
  }
  async readFile(_path: string): Promise<string> {
    unsupported();
  }
  async writeFile(_path: string, _contents: string): Promise<void> {
    unsupported();
  }
  async downloadFile(
    _url: string,
    _destinationPath: string,
    _options?: ReactNativeFilesystemDownloadOptions
  ): Promise<ReactNativeFilesystemDownloadResult> {
    unsupported();
  }
  async writeFileToDownloads(
    _filename: string,
    _contents: string,
    _mimeType?: string
  ): Promise<string> {
    unsupported();
  }
  async deleteFile(_path: string): Promise<void> {
    unsupported();
  }
  async mkdir(_path: string): Promise<void> {
    unsupported();
  }
  async readdir(_path: string): Promise<string[]> {
    unsupported();
  }
  async stat(_path: string): Promise<ReactNativeFilesystemStat> {
    unsupported();
  }
  async move(_from: string, _to: string): Promise<void> {
    unsupported();
  }
  async copy(_from: string, _to: string): Promise<void> {
    unsupported();
  }
}

export default registerWebModule(ReactNativeFilesystemModule, 'ReactNativeFilesystemModule');
