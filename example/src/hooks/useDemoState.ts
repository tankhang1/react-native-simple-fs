import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import ReactNativeFilesystem, {
  ReactNativeFilesystemCommonMimeTypes,
  joinReactNativeFilesystemPath,
  resolveReactNativeFilesystemDirectory,
  resolveReactNativeFilesystemFilePath,
  type ReactNativeFilesystemImageAsset,
} from 'react-native-simple-fs';
import {
  DEFAULT_CONTENTS,
  DEFAULT_DOWNLOAD_URL,
  DEFAULT_IMAGE_DOWNLOAD_URL,
  DEFAULT_IMAGE_LIST_LIMIT,
  DOCUMENTS_DIRECTORY,
  EXAMPLE_FILENAME,
  EXAMPLE_IMAGE_FILENAME,
  EXAMPLE_PDF_FILENAME,
  FALLBACK_DIRECTORY_PATH,
  FALLBACK_FILE_PATH,
  FALLBACK_IMAGE_FILE_PATH,
  TOAST_DURATION_MS,
} from '../constants';
import {
  createCustomDirectory,
  ensureAndroidMediaPermission,
  normalizeDemoImagePath,
} from '../utils';
import type { DemoImageLocation } from '../types';

type ReactNativeFilesystemDownloadProgressEvent = {
  bytesWritten: number;
  contentLength: number | null;
  destinationPath: string;
  progress: number | null;
  progressId: string | null;
  url: string;
};

export function useDemoState() {
  const [filePath, setFilePath] = useState(FALLBACK_FILE_PATH);
  const [imageFilePath, setImageFilePath] = useState(FALLBACK_IMAGE_FILE_PATH);
  const [imageLocation, setImageLocation] = useState<DemoImageLocation>('documents');
  const [directoryPath, setDirectoryPath] = useState(FALLBACK_DIRECTORY_PATH);
  const [contents, setContents] = useState(DEFAULT_CONTENTS);
  const [downloadUrl, setDownloadUrl] = useState(DEFAULT_DOWNLOAD_URL);
  const [imageDownloadUrl, setImageDownloadUrl] = useState(DEFAULT_IMAGE_DOWNLOAD_URL);
  const [imageListLimit, setImageListLimit] = useState(DEFAULT_IMAGE_LIST_LIMIT);
  const [status, setStatus] = useState('Ready');
  const [existsResult, setExistsResult] = useState('unknown');
  const [readResult, setReadResult] = useState('none');
  const [directoryEntries, setDirectoryEntries] = useState<string[]>([]);
  const [statResult, setStatResult] = useState('not loaded');
  const [documentsDirectory, setDocumentsDirectory] = useState('not loaded');
  const [downloadsResult, setDownloadsResult] = useState('none');
  const [downloadResult, setDownloadResult] = useState('none');
  const [downloadProgress, setDownloadProgress] = useState('idle');
  const [savedImageResult, setSavedImageResult] = useState('none');
  const [imagesResult, setImagesResult] = useState('none');
  const [savedImageAsset, setSavedImageAsset] = useState<ReactNativeFilesystemImageAsset | null>(null);
  const [images, setImages] = useState<ReactNativeFilesystemImageAsset[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const saveToFilesButtonTitle =
    Platform.OS === 'android' ? 'Write to downloads' : 'Save to Files';

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      resolveReactNativeFilesystemDirectory(DOCUMENTS_DIRECTORY),
      resolveReactNativeFilesystemFilePath(DOCUMENTS_DIRECTORY, EXAMPLE_FILENAME),
      resolveReactNativeFilesystemFilePath(DOCUMENTS_DIRECTORY, EXAMPLE_IMAGE_FILENAME),
    ])
      .then(([nextDirectoryPath, nextFilePath, nextImageFilePath]) => {
        if (!isMounted) {
          return;
        }

        setDocumentsDirectory(nextDirectoryPath);
        setDirectoryPath(nextDirectoryPath);
        setFilePath(nextFilePath);
        setImageFilePath(nextImageFilePath);
        setImageLocation('documents');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setDocumentsDirectory(`Unavailable: ${message}`);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = (ReactNativeFilesystem as any).addListener(
      'downloadProgress',
      (event: ReactNativeFilesystemDownloadProgressEvent) => {
        const percent =
          event.progress == null ? 'unknown' : `${Math.round(event.progress * 100)}%`;
        const totalBytes =
          event.contentLength == null ? 'unknown total' : `${event.contentLength} bytes`;
        setDownloadProgress(
          `${percent} (${event.bytesWritten}/${totalBytes}) -> ${event.destinationPath}`
        );
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!toastMessage || process.env.NODE_ENV === 'test') {
      return;
    }

    const timeoutId = setTimeout(() => {
      setToastMessage('');
    }, TOAST_DURATION_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [toastMessage]);

  function showToast(message: string) {
    setToastMessage(message);
  }

  async function runAction(actionName: string, action: () => Promise<void>) {
    try {
      await action();
      setStatus(`${actionName}: success`);
      showToast(`${actionName} succeeded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`${actionName}: ${message}`);
      showToast(`${actionName} failed: ${message}`);
    }
  }

  async function applyDocumentsDirectory() {
    if (!documentsDirectory || documentsDirectory.startsWith('Unavailable:')) {
      setStatus('documentsDirectory: unavailable');
      showToast('documentsDirectory unavailable');
      return;
    }

    const nextFilePath = await resolveReactNativeFilesystemFilePath(
      DOCUMENTS_DIRECTORY,
      EXAMPLE_FILENAME
    );
    const nextImageFilePath = await resolveReactNativeFilesystemFilePath(
      DOCUMENTS_DIRECTORY,
      EXAMPLE_IMAGE_FILENAME
    );
    setDirectoryPath(documentsDirectory);
    setFilePath(nextFilePath);
    setImageFilePath(nextImageFilePath);
    setImageLocation('documents');
    setStatus('documentsDirectory: applied');
    showToast('Switched to documents directory');
  }

  function applyCustomDirectory() {
    const customDirectoryPath = joinReactNativeFilesystemPath(
      documentsDirectory.startsWith('Unavailable:') ? FALLBACK_DIRECTORY_PATH : documentsDirectory,
      'custom'
    );
    const customDirectory = createCustomDirectory(customDirectoryPath);
    setDirectoryPath(customDirectoryPath);
    setFilePath(joinReactNativeFilesystemPath(customDirectoryPath, EXAMPLE_FILENAME));
    setImageFilePath(joinReactNativeFilesystemPath(customDirectoryPath, EXAMPLE_IMAGE_FILENAME));
    setImageLocation('custom');
    setStatus(`customDirectory: applied (${customDirectory.kind})`);
    showToast('Switched to custom directory');
  }

  async function applyImageDocumentsLocation() {
    if (!documentsDirectory || documentsDirectory.startsWith('Unavailable:')) {
      throw new Error('Documents directory is unavailable.');
    }

    const nextImageFilePath = await resolveReactNativeFilesystemFilePath(
      DOCUMENTS_DIRECTORY,
      EXAMPLE_IMAGE_FILENAME
    );
    setImageLocation('documents');
    setImageFilePath(nextImageFilePath);
    setSavedImageResult(`Image location set to Documents: ${nextImageFilePath}`);
  }

  function applyImagePhotosLocation() {
    setImageLocation('photos');
    setImageFilePath('photo-library');
    setSavedImageResult('Image location set to Photos. Use “List recent images” to browse.');
  }

  function applyImageCustomLocation() {
    const customDirectoryPath = joinReactNativeFilesystemPath(
      documentsDirectory.startsWith('Unavailable:') ? FALLBACK_DIRECTORY_PATH : documentsDirectory,
      'custom'
    );

    setImageLocation('custom');
    setImageFilePath(joinReactNativeFilesystemPath(customDirectoryPath, EXAMPLE_IMAGE_FILENAME));
    setSavedImageResult(`Image location set to Custom: ${customDirectoryPath}`);
  }

  async function resolveActiveImageFilePath() {
    if (imageLocation === 'documents') {
      const nextImageFilePath = await resolveReactNativeFilesystemFilePath(
        DOCUMENTS_DIRECTORY,
        EXAMPLE_IMAGE_FILENAME
      );
      setImageFilePath(nextImageFilePath);
      return nextImageFilePath;
    }

    if (imageLocation === 'custom') {
      const customDirectoryPath = joinReactNativeFilesystemPath(
        documentsDirectory.startsWith('Unavailable:') ? FALLBACK_DIRECTORY_PATH : documentsDirectory,
        'custom'
      );
      const resolvedPath = normalizeDemoImagePath(
        imageFilePath,
        customDirectoryPath,
        EXAMPLE_IMAGE_FILENAME
      );
      setImageFilePath(resolvedPath);
      return resolvedPath;
    }

    return imageFilePath;
  }

  async function applyPdfDemoDefaults() {
    const nextFilePath = await resolveReactNativeFilesystemFilePath(
      DOCUMENTS_DIRECTORY,
      EXAMPLE_PDF_FILENAME
    );

    setDownloadUrl(DEFAULT_DOWNLOAD_URL);
    setFilePath(nextFilePath);
    setDownloadResult('none');
    setDownloadsResult('none');
    setReadResult('none');
  }

  async function applyImageDemoDefaults() {
    await applyImageDocumentsLocation();
    setImageDownloadUrl(DEFAULT_IMAGE_DOWNLOAD_URL);
    setImageListLimit(DEFAULT_IMAGE_LIST_LIMIT);
    setImages([]);
    setImagesResult('none');
    setSavedImageAsset(null);
  }

  async function downloadSampleImage() {
    if (imageLocation === 'photos') {
      throw new Error('Photos mode browses the system library. Choose Documents or Custom to download a local sample image.');
    }

    const destinationPath = await resolveActiveImageFilePath();
    const result = await ReactNativeFilesystem.downloadFile(
      imageDownloadUrl,
      destinationPath,
      {
        mimeType: ReactNativeFilesystemCommonMimeTypes.Png,
      }
    );

    setImageFilePath(result.path);
    setSavedImageAsset(null);
    setSavedImageResult(`Prepared local image at ${result.path}`);
  }

  async function saveCurrentImageToLibrary() {
    if (imageLocation === 'photos') {
      throw new Error('Photos mode already points at the system library. Choose Documents or Custom to save a local image into Photos.');
    }

    const sourcePath = await resolveActiveImageFilePath();
    const result = await ReactNativeFilesystem.saveImageToLibrary(sourcePath, {
      mimeType: ReactNativeFilesystemCommonMimeTypes.Png,
    });

    setSavedImageAsset(result);
    setSavedImageResult(`Saved ${result.filename || 'image'} to ${result.uri}`);
  }

  async function loadRecentImages() {
    const permissionGranted = await ensureAndroidMediaPermission();
    if (!permissionGranted) {
      throw new Error('Android image permission was not granted.');
    }

    const limit = Number.parseInt(imageListLimit, 10);
    const nextImages = await ReactNativeFilesystem.getImages({
      limit: Number.isFinite(limit) && limit > 0 ? limit : 12,
    });

    setImages(nextImages);
    setImagesResult(
      `${nextImages.length} image${nextImages.length === 1 ? '' : 's'} loaded`
    );
  }

  async function deleteImageFromLibrary(asset: ReactNativeFilesystemImageAsset) {
    await ReactNativeFilesystem.deleteImageFromLibrary({ asset });

    if (savedImageAsset?.id === asset.id) {
      setSavedImageAsset(null);
      setSavedImageResult(`Deleted ${asset.filename || 'saved image'} from the system library`);
    } else {
      setSavedImageResult(`Deleted ${asset.filename || 'image'} from the system library`);
    }

    const nextImages = images.filter((image) => image.id !== asset.id);
    setImages(nextImages);
    setImagesResult(
      `${nextImages.length} image${nextImages.length === 1 ? '' : 's'} remaining`
    );
  }

  return {
    sharedProps: {
      filePath,
      imageFilePath,
      imageLocation,
      directoryPath,
      contents,
      downloadUrl,
      imageDownloadUrl,
      imageListLimit,
      status,
      existsResult,
      readResult,
      directoryEntries,
      statResult,
      documentsDirectory,
      downloadsResult,
      downloadResult,
      downloadProgress,
      savedImageResult,
      imagesResult,
      savedImageAsset,
      images,
      saveToFilesButtonTitle,
      setFilePath,
      setImageFilePath,
      setImageLocation,
      setDirectoryPath,
      setContents,
      setDownloadUrl,
      setImageDownloadUrl,
      setImageListLimit,
      setExistsResult,
      setReadResult,
      setDirectoryEntries,
      setStatResult,
      setDownloadsResult,
      setDownloadResult,
      setDownloadProgress,
      setSavedImageResult,
      setImagesResult,
      setSavedImageAsset,
      setImages,
      applyPdfDemoDefaults,
      applyImageDemoDefaults,
      applyImageDocumentsLocation,
      applyImagePhotosLocation,
      applyImageCustomLocation,
      downloadSampleImage,
      saveCurrentImageToLibrary,
      loadRecentImages,
      deleteImageFromLibrary,
      applyDocumentsDirectory,
      applyCustomDirectory,
      runAction,
    },
    toastMessage,
  };
}
