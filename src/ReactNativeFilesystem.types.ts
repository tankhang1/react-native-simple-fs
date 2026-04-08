import type { StyleProp, ViewStyle } from 'react-native';

export type ReactNativeFilesystemStat = {
  path: string;
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modificationTime: number | null;
};

export type OnLoadEventPayload = {
  url: string;
};

export type ReactNativeFilesystemModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

export type ChangeEventPayload = {
  value: string;
};

export enum ReactNativeFilesystemDirectoryKind {
  Documents = 'documents',
  Custom = 'custom',
}

export type ReactNativeFilesystemDirectoryDescriptor =
  | {
      kind: ReactNativeFilesystemDirectoryKind.Documents;
    }
  | {
      kind: ReactNativeFilesystemDirectoryKind.Custom;
      path: string;
    };

export type ReactNativeFilesystemViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};
