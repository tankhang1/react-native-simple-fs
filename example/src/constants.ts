import { ReactNativeFilesystemDirectoryKind, type ReactNativeFilesystemDirectoryDescriptor } from 'react-native-simple-fs';

export const FALLBACK_FILE_PATH = '/tmp/react-native-filesystem/example.txt';
export const FALLBACK_DIRECTORY_PATH = '/tmp/react-native-filesystem';
export const FALLBACK_IMAGE_FILE_PATH = '/tmp/react-native-filesystem/example-image.png';
export const DEFAULT_CONTENTS = 'Hello from React Native Filesystem';
export const EXAMPLE_FILENAME = 'example.txt';
export const EXAMPLE_PDF_FILENAME = 'sample.pdf';
export const DEFAULT_DOWNLOAD_URL = 'https://pdfobject.com/pdf/sample.pdf';
export const DEFAULT_IMAGE_DOWNLOAD_URL = 'https://i.pinimg.com/736x/b3/bc/45/b3bc459af204f37a4bdd78f991d5e6cf.jpg';
export const EXAMPLE_IMAGE_FILENAME = 'example-image.png';
export const DEFAULT_IMAGE_LIST_LIMIT = '12';
export const TOAST_DURATION_MS = 2400;

export const DOCUMENTS_DIRECTORY: ReactNativeFilesystemDirectoryDescriptor = {
  kind: ReactNativeFilesystemDirectoryKind.Documents,
};
