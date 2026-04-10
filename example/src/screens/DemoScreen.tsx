import {
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import ReactNativeFilesystem, {
  ReactNativeFilesystemView,
} from "react-native-filesystem";
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
    directoryPath,
    contents,
    downloadUrl,
    status,
    existsResult,
    readResult,
    directoryEntries,
    statResult,
    documentsDirectory,
    downloadsResult,
    downloadResult,
    saveToFilesButtonTitle,
    setFilePath,
    setDirectoryPath,
    setContents,
    setDownloadUrl,
    setExistsResult,
    setReadResult,
    setDirectoryEntries,
    setStatResult,
    setDownloadsResult,
    setDownloadResult,
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
  const showResults = mode === "results";
  const showPreview = isOverview || mode === "preview";

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
              Paste a remote link here, then run the download action below.
            </Text>

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
              Change the target path, the file body, or the remote download URL.
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
                description="Try the HTTPS download API and the platform-native save flow."
              >
                <View style={styles.buttonGrid}>
                  <ActionTile
                    title="Download HTTPS file"
                    caption="Fetch a remote file into the current path."
                    onPress={() =>
                      runAction("downloadFile", async () => {
                        const result = await ReactNativeFilesystem.downloadFile(
                          downloadUrl,
                          filePath,
                        );
                        setDownloadResult(JSON.stringify(result));
                        if (isTextReadableFile(result.path)) {
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
                        setFilePath(result);
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
                  title="Downloads result"
                  value={downloadsResult}
                  accent="#7a4a12"
                  textTestID="downloads-result"
                />
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
              title="Downloads result"
              value={downloadsResult}
              accent="#7a4a12"
              textTestID="downloads-result"
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
