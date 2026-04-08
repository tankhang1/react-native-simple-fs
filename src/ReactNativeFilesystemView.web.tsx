import * as React from 'react';

import { ReactNativeFilesystemViewProps } from './ReactNativeFilesystem.types';

export default function ReactNativeFilesystemView(props: ReactNativeFilesystemViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
