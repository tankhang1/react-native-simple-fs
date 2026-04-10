import type { StyleProp, ViewStyle } from 'react-native';

export type ReactNativeFilesystemStat = {
  path: string;
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modificationTime: number | null;
};

export type ReactNativeFilesystemDownloadResult = {
  path: string;
  bytesWritten: number;
  statusCode: number;
};

export type ReactNativeFilesystemDownloadOptions = {
  mimeType?: string;
};

export const ReactNativeFilesystemCommonMimeTypes = {
  Csv: 'text/csv',
  Gif: 'image/gif',
  Html: 'text/html',
  Jpeg: 'image/jpeg',
  Json: 'application/json',
  Pdf: 'application/pdf',
  Png: 'image/png',
  Text: 'text/plain',
  Webp: 'image/webp',
  Xml: 'application/xml',
  Zip: 'application/zip',
} as const;

export type ReactNativeFilesystemCommonMimeType =
  (typeof ReactNativeFilesystemCommonMimeTypes)[keyof typeof ReactNativeFilesystemCommonMimeTypes];

export type OnLoadEventPayload = {
  url: string;
};

export type ReactNativeFilesystemModuleEvents = Record<string, never>;

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
