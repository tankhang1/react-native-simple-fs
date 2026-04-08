import { NativeModule, requireNativeModule } from 'expo';

import { ReactNativeFilesystemModuleEvents } from './ReactNativeFilesystem.types';

declare class ReactNativeFilesystemModule extends NativeModule<ReactNativeFilesystemModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ReactNativeFilesystemModule>('ReactNativeFilesystem');
