import { registerWebModule, NativeModule } from 'expo';

import { ReactNativeFilesystemModuleEvents } from './ReactNativeFilesystem.types';

class ReactNativeFilesystemModule extends NativeModule<ReactNativeFilesystemModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ReactNativeFilesystemModule, 'ReactNativeFilesystemModule');
