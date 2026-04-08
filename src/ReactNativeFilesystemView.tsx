import { requireNativeView } from 'expo';
import * as React from 'react';

import { ReactNativeFilesystemViewProps } from './ReactNativeFilesystem.types';

const NativeView: React.ComponentType<ReactNativeFilesystemViewProps> =
  requireNativeView('ReactNativeFilesystem');

export default function ReactNativeFilesystemView(props: ReactNativeFilesystemViewProps) {
  return <NativeView {...props} />;
}
