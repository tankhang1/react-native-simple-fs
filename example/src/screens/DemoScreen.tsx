import {
  Button,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import ReactNativeFilesystem, {
  ReactNativeFilesystemCommonMimeTypes,
  ReactNativeFilesystemView,
  type ReactNativeFilesystemImageAsset,
} from "react-native-simple-fs";
import {
  ActionSection,
  ActionTile,
  Card,
  Field,
  InfoRow,
  MetricCard,
  ResultPanel,
} from "../components/ui";
import { styles } from "../styles";
import type { DemoScreenProps } from "../types";
import {
  createSnippet,
  getModeMeta,
  getStatusTone,
  isTextReadableFile,
} from "../utils";

export function DemoScreen(props: DemoScreenProps) {
  const {
    mode,
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
  } = props;

  const statusTone = getStatusTone(status);
  const modeMeta = getModeMeta(mode);
  const isOverview = mode === "overview";
  const showShortcut = isOverview || mode === "remote";
  const showWorkspace = isOverview || mode === "workspace";
  const showEditor = isOverview || mode === "editor" || mode === "remote";
  const showFileActions = isOverview || mode === "file";
  const showDirectoryActions = isOverview || mode === "directory";
  const showRemoteActions = isOverview || mode === "remote";
  const showMediaActions = isOverview || mode === "media";
  const showResults = mode === "results";
  const showPreview = isOverview || mode === "preview";
  const downloadTargetPath =
    Platform.OS === "android" ? filePath.split("/").pop() || "downloaded-file" : filePath;

  function formatAssetDate(timestamp: number | null) {
    if (timestamp == null) {
      return "Unknown date";
    }

    return new Date(timestamp * 1000).toLocaleString();
  }

  function formatAssetSubtitle(asset: ReactNativeFilesystemImageAsset) {
    const parts = [
      asset.width != null && asset.height != null
        ? `${asset.width} x ${asset.height}`
        : null,
      asset.mimeType,
      asset.size != null ? `${asset.size} bytes` : null,
      formatAssetDate(asset.creationTime),
    ].filter(Boolean);

    return parts.join(" • ");
  }

  function renderMediaCard(
    asset: ReactNativeFilesystemImageAsset,
    index: number,
    prefix: string,
    allowDelete = false,
  ) {
    const imageSourceUri = asset.previewUri || asset.uri;

    return (
      <View key={`${prefix}-${asset.id}-${index}`} style={styles.mediaCard}>
        {imageSourceUri ? (
          <Image
            source={{ uri: imageSourceUri }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.mediaFallback}>
            <Text style={styles.mediaFallbackText}>No preview available</Text>
          </View>
        )}
        <View style={styles.mediaMeta}>
          <Text style={styles.mediaTitle}>
            {asset.filename || `Image ${index + 1}`}
          </Text>
          <Text style={styles.mediaCaption}>{formatAssetSubtitle(asset)}</Text>
          <Text style={styles.mediaCaption}>{asset.uri || "No URI available"}</Text>
          {allowDelete ? (
            <View style={styles.mediaActionRow}>
              <Button
                title="Delete from library"
                onPress={() =>
                  runAction("deleteImageFromLibrary", async () => {
                    await deleteImageFromLibrary(asset);
                  })
                }
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>react-native-filesystem</Text>
          <Text style={styles.heroTitle}>{modeMeta.title}</Text>
          <Text style={styles.heroBody}>{modeMeta.description}</Text>

          <View style={styles.metricRow}>
            <MetricCard label="Platform" value={Platform.OS} />
            <MetricCard
              label="Documents"
              value={
                documentsDirectory.startsWith("Unavailable:")
                  ? "Unavailable"
                  : "Ready"
              }
            />
            <MetricCard label="Last Status" value={statusTone.label} />
          </View>
        </View>

        {showShortcut && (
          <Card>
            <Text style={styles.cardTitle}>HTTPS Demo Shortcut</Text>
            <Text style={styles.cardSubtitle}>
              Use the ready-made presets below or paste your own URL, then run one function at a time.
            </Text>

            <View style={styles.buttonGrid}>
              <ActionTile
                title="Use PDF demo"
                caption="Load the sample PDF URL and a matching local destination."
                onPress={applyPdfDemoDefaults}
              />
              {showMediaActions && (
                <ActionTile
                  title="Use image demo"
                  caption="Load the sample image URL and reset the media demo state."
                  onPress={applyImageDemoDefaults}
                />
              )}
            </View>

            <Field label="HTTPS URL">
              <TextInput
                testID="download-url-input"
                value={downloadUrl}
                onChangeText={setDownloadUrl}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </Field>
          </Card>
        )}

        {showWorkspace && (
          <Card>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Workspace Setup</Text>
                <Text style={styles.cardSubtitle}>
                  Switch between app documents and a custom folder, then
                  experiment freely.
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusTone.backgroundColor,
                    borderColor: statusTone.borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: statusTone.textColor },
                  ]}
                >
                  {statusTone.label}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Documents directory</Text>
              <Text testID="documents-directory" style={styles.infoValue}>
                Documents directory: {documentsDirectory}
              </Text>
            </View>
            <InfoRow label="Active file path" value={filePath} />
            <InfoRow label="Active directory" value={directoryPath} />

            <View style={styles.buttonGrid}>
              <ActionTile
                title="Use documents directory"
                caption="Jump back to the safe app sandbox."
                onPress={applyDocumentsDirectory}
              />
              <ActionTile
                title="Use custom directory"
                caption="Create a separate working area inside your app storage."
                onPress={applyCustomDirectory}
              />
            </View>

            <ResultPanel
              title="Status"
              value={status}
              accent="#205a43"
              textTestID="status-text"
            />
          </Card>
        )}

        {showEditor && (
          <Card>
            <Text style={styles.cardTitle}>Editor</Text>
            <Text style={styles.cardSubtitle}>
              Each area below starts with a working default so you can test a single function quickly.
            </Text>

            <Field label="File path">
              <TextInput
                testID="file-path-input"
                value={filePath}
                onChangeText={setFilePath}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </Field>

            <Field label="Directory path">
              <TextInput
                testID="directory-path-input"
                value={directoryPath}
                onChangeText={setDirectoryPath}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </Field>

            <Field label="Contents">
              <TextInput
                testID="contents-input"
                multiline
                value={contents}
                onChangeText={setContents}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, styles.multilineInput]}
              />
            </Field>

            <Field label="HTTPS URL">
              <TextInput
                testID="download-url-input"
                value={downloadUrl}
                onChangeText={setDownloadUrl}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </Field>

            {showMediaActions && (
              <>
                <Field label="Image file path">
                  <TextInput
                    testID="image-file-path-input"
                    value={imageFilePath}
                    onChangeText={(value) => {
                      if (imageLocation !== "custom") {
                        return;
                      }
                      setImageFilePath(value);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={imageLocation === "custom"}
                    style={styles.input}
                  />
                </Field>

                <Field label="Image location">
                  <View style={styles.inlineButtonRow}>
                    <ActionTile
                      title="Documents"
                      caption={
                        imageLocation === "documents"
                          ? "Selected local documents path."
                          : "Use the app Documents folder for the local image."
                      }
                      onPress={applyImageDocumentsLocation}
                    />
                    <ActionTile
                      title="Photos"
                      caption={
                        imageLocation === "photos"
                          ? "Selected system photo library."
                          : "Browse images already saved in the system photo library."
                      }
                      onPress={applyImagePhotosLocation}
                    />
                    <ActionTile
                      title="Custom"
                      caption={
                        imageLocation === "custom"
                          ? "Selected custom local path."
                          : "Use a custom folder path for the local image."
                      }
                      onPress={applyImageCustomLocation}
                    />
                  </View>
                </Field>

                <Field label="Image HTTPS URL">
                  <TextInput
                    testID="image-download-url-input"
                    value={imageDownloadUrl}
                    onChangeText={setImageDownloadUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </Field>

                <Field label="Image list limit">
                  <TextInput
                    testID="image-list-limit-input"
                    value={imageListLimit}
                    onChangeText={setImageListLimit}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </Field>
              </>
            )}

            <View style={styles.snippetCard}>
              <Text style={styles.snippetLabel}>Live snippet</Text>
              <Text style={styles.snippetText}>
                {createSnippet(filePath, downloadUrl)}
              </Text>
            </View>
          </Card>
        )}

        {(showFileActions || showDirectoryActions || showRemoteActions) && (
          <Card>
            <Text style={styles.cardTitle}>Actions</Text>
            <Text style={styles.cardSubtitle}>
              Each action updates the result panels below so you can see the
              current state.
            </Text>

            {showFileActions && (
              <ActionSection
                title="File lifecycle"
                description="Write, read, check, and remove a file at the selected path."
              >
                <View style={styles.buttonGrid}>
                  <ActionTile
                    title="Exists"
                    caption="Check whether the current file path exists."
                    onPress={() =>
                      runAction("exists", async () => {
                        const exists =
                          await ReactNativeFilesystem.exists(filePath);
                        setExistsResult(String(exists));
                      })
                    }
                  />
                  <ActionTile
                    title="Write file"
                    caption="Persist the text content into the target file."
                    onPress={() =>
                      runAction("writeFile", async () => {
                        await ReactNativeFilesystem.writeFile(
                          filePath,
                          contents,
                        );
                      })
                    }
                  />
                  <ActionTile
                    title="Read file"
                    caption="Load the file contents as UTF-8 text."
                    onPress={() =>
                      runAction("readFile", async () => {
                        const nextContents =
                          await ReactNativeFilesystem.readFile(filePath);
                        setReadResult(nextContents);
                      })
                    }
                  />
                  <ActionTile
                    title="Delete file"
                    caption="Remove the current file or folder path."
                    onPress={() =>
                      runAction("deleteFile", async () => {
                        await ReactNativeFilesystem.deleteFile(filePath);
                      })
                    }
                  />
                </View>
                <ResultPanel title="Status" value={status} accent="#205a43" />
                <ResultPanel
                  title="Exists"
                  value={existsResult}
                  accent="#5b4b9a"
                  textTestID="exists-result"
                />
                <ResultPanel
                  title="Read result"
                  value={readResult}
                  accent="#8f304d"
                  textTestID="read-result"
                />
              </ActionSection>
            )}

            {showDirectoryActions && (
              <ActionSection
                title="Directory tools"
                description="Create a folder, inspect it, and view metadata for the active path."
              >
                <View style={styles.buttonGrid}>
                  <ActionTile
                    title="Make directory"
                    caption="Ensure the selected directory path exists."
                    onPress={() =>
                      runAction("mkdir", async () => {
                        await ReactNativeFilesystem.mkdir(directoryPath);
                      })
                    }
                  />
                  <ActionTile
                    title="Read directory"
                    caption="List the entries currently inside the folder."
                    onPress={() =>
                      runAction("readdir", async () => {
                        const entries =
                          await ReactNativeFilesystem.readdir(directoryPath);
                        setDirectoryEntries(entries);
                      })
                    }
                  />
                  <ActionTile
                    title="Stat path"
                    caption="Inspect metadata like size and modification time."
                    onPress={() =>
                      runAction("stat", async () => {
                        const details =
                          await ReactNativeFilesystem.stat(filePath);
                        setStatResult(JSON.stringify(details));
                      })
                    }
                  />
                </View>
                <ResultPanel
                  title="Directory entries"
                  value={directoryEntries.join(", ") || "none"}
                  accent="#0f6262"
                  textTestID="readdir-result"
                />
                <ResultPanel
                  title="Stat"
                  value={statResult}
                  accent="#5f3c85"
                  textTestID="stat-result"
                />
              </ActionSection>
            )}

            {showRemoteActions && (
              <ActionSection
                title="Remote and export flows"
                description="Step 1: use the PDF preset above. Step 2: run the download or export action below."
              >
                <View style={styles.buttonGrid}>
                  <ActionTile
                    title="Download HTTPS file"
                    caption="Fetch a remote file into the current path."
                    onPress={() =>
                      runAction("downloadFile", async () => {
                        setDownloadProgress("starting");
                        const result = await ReactNativeFilesystem.downloadFile(
                          downloadUrl,
                          downloadTargetPath,
                          {
                            onProgressIntervalMs: 150,
                            progressId: "example-download",
                            saveToDownloads: Platform.OS === "android",
                          } as any
                        );
                        setDownloadResult(JSON.stringify(result));
                        if (Platform.OS === "android") {
                          setDownloadsResult(result.path);
                        }
                        if (Platform.OS !== "android" && isTextReadableFile(result.path)) {
                          setReadResult(
                            await ReactNativeFilesystem.readFile(result.path),
                          );
                        } else {
                          setReadResult(
                            `Binary file saved at ${result.path}. Use stat() or open it with a viewer instead of readFile().`,
                          );
                        }
                      })
                    }
                  />
                  <ActionTile
                    title={saveToFilesButtonTitle}
                    caption="Send the current contents to Downloads or the Files picker."
                    onPress={() =>
                      runAction("writeFileToDownloads", async () => {
                        const result =
                          await ReactNativeFilesystem.writeFileToDownloads(
                            "react-native-filesystem-example.txt",
                            contents,
                            "text/plain",
                          );
                        setDownloadsResult(result);
                      })
                    }
                  />
                </View>
                <ResultPanel title="Status" value={status} accent="#205a43" />
                <ResultPanel
                  title="Download result"
                  value={downloadResult}
                  accent="#1e5b85"
                  textTestID="download-result"
                />
                <ResultPanel
                  title="Download progress"
                  value={downloadProgress}
                  accent="#0f6262"
                />
                <ResultPanel
                  title="Downloads result"
                  value={downloadsResult}
                  accent="#7a4a12"
                  textTestID="downloads-result"
                />
              </ActionSection>
            )}

            {showMediaActions && (
              <ActionSection
                title="System image library"
                description="Step 1: use the image preset. Step 2: download a local image. Step 3: save it to Photos. Step 4: list or delete images from the current library."
              >
                <View style={styles.buttonGrid}>
                  <ActionTile
                    title="Use image demo"
                    caption="Reset the media flow with the default image URL and a safe documents path."
                    onPress={applyImageDemoDefaults}
                  />
                  <ActionTile
                    title="Download sample image"
                    caption="Fetch a PNG into app storage so it can be saved to the media library."
                    onPress={() => runAction("downloadImage", downloadSampleImage)}
                  />
                  <ActionTile
                    title="Save image to library"
                    caption="Copy the current local image file into the system photo library."
                    onPress={() => runAction("saveImageToLibrary", saveCurrentImageToLibrary)}
                  />
                  <ActionTile
                    title="List recent images"
                    caption="Read recent image entries from the system library."
                    onPress={() => runAction("getImages", loadRecentImages)}
                  />
                  {savedImageAsset ? (
                    <ActionTile
                      title="Delete saved image"
                      caption="Remove the most recently saved demo image from the system photo library."
                      onPress={() =>
                        runAction("deleteImageFromLibrary", async () => {
                          await deleteImageFromLibrary(savedImageAsset);
                        })
                      }
                    />
                  ) : null}
                </View>
                <ResultPanel title="Status" value={status} accent="#205a43" />
                <ResultPanel
                  title="Saved image"
                  value={savedImageResult}
                  accent="#8b5d12"
                  textTestID="saved-image-result"
                />
                <ResultPanel
                  title="Image location"
                  value={imageLocation}
                  accent="#5b4b9a"
                  textTestID="image-location-result"
                />
                <ResultPanel
                  title="Images"
                  value={imagesResult}
                  accent="#255f85"
                  textTestID="images-result"
                />
                <View style={styles.mediaSectionHeader}>
                  <Text style={styles.cardTitle}>Recent Images</Text>
                  <Text style={styles.mediaCountText}>
                    {images.length === 0
                      ? "Run “List recent images” to load the media gallery."
                      : `${images.length} image${images.length === 1 ? "" : "s"} loaded`}
                  </Text>
                </View>
                <View style={styles.mediaGrid}>
                  {savedImageAsset ? renderMediaCard(savedImageAsset, 0, "saved", true) : null}
                  {images.map((asset, index) =>
                    renderMediaCard(asset, index, "list", true),
                  )}
                </View>
              </ActionSection>
            )}
          </Card>
        )}

        {showResults && (
          <Card>
            <Text style={styles.cardTitle}>Results</Text>
            <Text style={styles.cardSubtitle}>
              These panels mirror the native module responses so you can
              validate behavior quickly.
            </Text>

            <ResultPanel
              title="Status"
              value={status}
              accent="#205a43"
              textTestID="status-text"
            />
            <ResultPanel
              title="Download result"
              value={downloadResult}
              accent="#1e5b85"
              textTestID="download-result"
            />
            <ResultPanel
              title="Download progress"
              value={downloadProgress}
              accent="#0f6262"
            />
            <ResultPanel
              title="Downloads result"
              value={downloadsResult}
              accent="#7a4a12"
              textTestID="downloads-result"
            />
            <ResultPanel
              title="Saved image"
              value={savedImageResult}
              accent="#8b5d12"
              textTestID="saved-image-result"
            />
            <ResultPanel
              title="Images"
              value={imagesResult}
              accent="#255f85"
              textTestID="images-result"
            />
            <ResultPanel
              title="Exists"
              value={existsResult}
              accent="#5b4b9a"
              textTestID="exists-result"
            />
            <ResultPanel
              title="Read result"
              value={readResult}
              accent="#8f304d"
              textTestID="read-result"
            />
            <ResultPanel
              title="Directory entries"
              value={directoryEntries.join(", ") || "none"}
              accent="#0f6262"
              textTestID="readdir-result"
            />
            <ResultPanel
              title="Stat"
              value={statResult}
              accent="#5f3c85"
              textTestID="stat-result"
            />
          </Card>
        )}

        {showPreview && (
          <Card>
            <Text style={styles.cardTitle}>Web View Preview</Text>
            <Text style={styles.cardSubtitle}>
              The bundled native view is shown below so the example demonstrates
              both module and view APIs.
            </Text>
            <View style={styles.previewShell}>
              <ReactNativeFilesystemView
                url="https://www.example.com"
                onLoad={({
                  nativeEvent: { url },
                }: {
                  nativeEvent: { url: string };
                }) => console.log(`Loaded: ${url}`)}
                style={styles.view}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
