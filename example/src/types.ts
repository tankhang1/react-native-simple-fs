import type { ReactNativeFilesystemImageAsset } from 'react-native-simple-fs';

export type DemoImageLocation = 'documents' | 'photos' | 'custom';

export type DemoMode =
  | 'overview'
  | 'workspace'
  | 'editor'
  | 'file'
  | 'directory'
  | 'remote'
  | 'media'
  | 'results'
  | 'preview';

export type DemoSharedProps = {
  filePath: string;
  imageFilePath: string;
  imageLocation: DemoImageLocation;
  directoryPath: string;
  contents: string;
  downloadUrl: string;
  imageDownloadUrl: string;
  imageListLimit: string;
  status: string;
  existsResult: string;
  readResult: string;
  directoryEntries: string[];
  statResult: string;
  documentsDirectory: string;
  downloadsResult: string;
  downloadResult: string;
  downloadProgress: string;
  savedImageResult: string;
  imagesResult: string;
  savedImageAsset: ReactNativeFilesystemImageAsset | null;
  images: ReactNativeFilesystemImageAsset[];
  saveToFilesButtonTitle: string;
  setFilePath: (value: string) => void;
  setImageFilePath: (value: string) => void;
  setImageLocation: (value: DemoImageLocation) => void;
  setDirectoryPath: (value: string) => void;
  setContents: (value: string) => void;
  setDownloadUrl: (value: string) => void;
  setImageDownloadUrl: (value: string) => void;
  setImageListLimit: (value: string) => void;
  setExistsResult: (value: string) => void;
  setReadResult: (value: string) => void;
  setDirectoryEntries: (value: string[]) => void;
  setStatResult: (value: string) => void;
  setDownloadsResult: (value: string) => void;
  setDownloadResult: (value: string) => void;
  setDownloadProgress: (value: string) => void;
  setSavedImageResult: (value: string) => void;
  setImagesResult: (value: string) => void;
  setSavedImageAsset: (value: ReactNativeFilesystemImageAsset | null) => void;
  setImages: (value: ReactNativeFilesystemImageAsset[]) => void;
  applyImageDocumentsLocation: () => Promise<void>;
  applyImagePhotosLocation: () => void;
  applyImageCustomLocation: () => void;
  downloadSampleImage: () => Promise<void>;
  saveCurrentImageToLibrary: () => Promise<void>;
  loadRecentImages: () => Promise<void>;
  applyPdfDemoDefaults: () => Promise<void>;
  applyImageDemoDefaults: () => Promise<void>;
  applyDocumentsDirectory: () => Promise<void>;
  applyCustomDirectory: () => void;
  runAction: (actionName: string, action: () => Promise<void>) => Promise<void>;
};

export type DemoScreenProps = DemoSharedProps & {
  mode: DemoMode;
};
