import {
  ReactNativeFilesystemCommonMimeTypes,
  ReactNativeFilesystemDirectoryKind,
  type ReactNativeFilesystemDirectoryDescriptor,
} from 'react-native-filesystem';
import type { DemoMode } from './types';

const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  csv: ReactNativeFilesystemCommonMimeTypes.Csv,
  gif: ReactNativeFilesystemCommonMimeTypes.Gif,
  htm: ReactNativeFilesystemCommonMimeTypes.Html,
  html: ReactNativeFilesystemCommonMimeTypes.Html,
  jpeg: ReactNativeFilesystemCommonMimeTypes.Jpeg,
  jpg: ReactNativeFilesystemCommonMimeTypes.Jpeg,
  json: ReactNativeFilesystemCommonMimeTypes.Json,
  pdf: ReactNativeFilesystemCommonMimeTypes.Pdf,
  png: ReactNativeFilesystemCommonMimeTypes.Png,
  txt: ReactNativeFilesystemCommonMimeTypes.Text,
  webp: ReactNativeFilesystemCommonMimeTypes.Webp,
  xml: ReactNativeFilesystemCommonMimeTypes.Xml,
  zip: ReactNativeFilesystemCommonMimeTypes.Zip,
};

function getExtension(value: string): string | null {
  const sanitizedValue = value.split('?')[0]?.split('#')[0] ?? value;
  const lastSegment = sanitizedValue.split('/').pop() ?? '';
  const extension = lastSegment.split('.').pop()?.toLowerCase();

  if (!extension || extension === lastSegment.toLowerCase()) {
    return null;
  }

  return extension;
}

const TEXT_READABLE_EXTENSIONS = new Set([
  "csv",
  "htm",
  "html",
  "json",
  "txt",
  "xml",
]);

function inferMimeType(filePath: string, downloadUrl: string): string | null {
  const filePathExtension = getExtension(filePath);
  if (filePathExtension) {
    return null;
  }

  const downloadUrlExtension = getExtension(downloadUrl);
  if (!downloadUrlExtension) {
    return null;
  }

  return EXTENSION_TO_MIME_TYPE[downloadUrlExtension] ?? null;
}

export function createCustomDirectory(path: string): ReactNativeFilesystemDirectoryDescriptor {
  return {
    kind: ReactNativeFilesystemDirectoryKind.Custom,
    path,
  };
}

export function getStatusTone(status: string) {
  if (status.includes(': success')) {
    return {
      backgroundColor: '#e3f7ec',
      borderColor: '#8fd3ab',
      textColor: '#155b3a',
      label: 'Healthy',
    };
  }

  if (status === 'Ready') {
    return {
      backgroundColor: '#fff7dd',
      borderColor: '#f0d27a',
      textColor: '#7a5610',
      label: 'Idle',
    };
  }

  return {
    backgroundColor: '#ffe8e2',
    borderColor: '#efb0a2',
    textColor: '#8b2f1f',
    label: 'Needs attention',
  };
}

export function createSnippet(filePath: string, downloadUrl: string) {
  const inferredMimeType = inferMimeType(filePath, downloadUrl);

  return [
    "import ReactNativeFilesystem from 'react-native-filesystem';",
    '',
    'await ReactNativeFilesystem.downloadFile(',
    `  '${downloadUrl}',`,
    `  '${filePath}',`,
    ...(inferredMimeType ? [`  { mimeType: '${inferredMimeType}' },`] : []),
    ');',
  ].join('\n');
}

export function isTextReadableFile(path: string) {
  const extension = getExtension(path);
  return extension ? TEXT_READABLE_EXTENSIONS.has(extension) : false;
}

export function getModeMeta(mode: DemoMode) {
  switch (mode) {
    case 'workspace':
      return {
        title: 'Workspace Setup',
        description: 'Choose the folder and path you want to experiment with.',
      };
    case 'editor':
      return {
        title: 'Editor',
        description: 'Edit paths, contents, and live code snippets.',
      };
    case 'file':
      return {
        title: 'File Actions',
        description: 'Test read, write, exists, and delete in one place.',
      };
    case 'directory':
      return {
        title: 'Directory',
        description: 'Create directories and inspect folder contents.',
      };
    case 'remote':
      return {
        title: 'HTTPS Download',
        description: 'Paste a link and demo the download and export flow quickly.',
      };
    case 'results':
      return {
        title: 'Results',
        description: 'Review the latest native responses and payloads.',
      };
    case 'preview':
      return {
        title: 'Preview',
        description: 'Show the bundled native view API in the same demo app.',
      };
    default:
      return {
        title: 'Demo Lab',
        description: 'A full tour of every filesystem feature in one polished screen.',
      };
  }
}
