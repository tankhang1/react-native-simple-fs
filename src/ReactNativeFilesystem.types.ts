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

export type ReactNativeFilesystemDownloadProgressEvent = {
  bytesWritten: number;
  contentLength: number | null;
  destinationPath: string;
  progress: number | null;
  progressId: string | null;
  url: string;
};

export type ReactNativeFilesystemDownloadOptions = {
  mimeType?: string;
  onProgressIntervalMs?: number;
  progressId?: string;
  saveToDownloads?: boolean;
};

export type ReactNativeFilesystemImageAsset = {
  id: string;
  uri: string;
  previewUri?: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  size: number | null;
  creationTime: number | null;
  modificationTime: number | null;
};

export type ReactNativeFilesystemSaveImageOptions = {
  filename?: string;
  mimeType?: string;
};

export type ReactNativeFilesystemGetImagesOptions = {
  limit?: number;
};

export type ReactNativeFilesystemDeleteImageOptions = {
  asset: ReactNativeFilesystemImageAsset;
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

export type ReactNativeFilesystemModuleEvents = {
  downloadProgress: (event: ReactNativeFilesystemDownloadProgressEvent) => void;
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
