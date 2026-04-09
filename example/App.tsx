import { useEffect, useState } from 'react';
import ReactNativeFilesystem, {
  joinReactNativeFilesystemPath,
  ReactNativeFilesystemDirectoryKind,
  type ReactNativeFilesystemDirectoryDescriptor,
  ReactNativeFilesystemView,
  resolveReactNativeFilesystemDirectory,
  resolveReactNativeFilesystemFilePath,
} from 'react-native-filesystem';
import {
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const FALLBACK_FILE_PATH = '/tmp/react-native-filesystem/example.txt';
const FALLBACK_DIRECTORY_PATH = '/tmp/react-native-filesystem';
const DEFAULT_CONTENTS = 'Hello from React Native Filesystem';
const EXAMPLE_FILENAME = 'example.txt';
const DEFAULT_DOWNLOAD_URL = 'https://www.w3.org/TR/PNG/iso_8859-1.txt';

const DOCUMENTS_DIRECTORY: ReactNativeFilesystemDirectoryDescriptor = {
  kind: ReactNativeFilesystemDirectoryKind.Documents,
};

function createCustomDirectory(path: string): ReactNativeFilesystemDirectoryDescriptor {
  return {
    kind: ReactNativeFilesystemDirectoryKind.Custom,
    path,
  };
}

export default function App() {
  const [filePath, setFilePath] = useState(FALLBACK_FILE_PATH);
  const [directoryPath, setDirectoryPath] = useState(FALLBACK_DIRECTORY_PATH);
  const [contents, setContents] = useState(DEFAULT_CONTENTS);
  const [downloadUrl, setDownloadUrl] = useState(DEFAULT_DOWNLOAD_URL);
  const [status, setStatus] = useState('Ready');
  const [existsResult, setExistsResult] = useState('unknown');
  const [readResult, setReadResult] = useState('none');
  const [directoryEntries, setDirectoryEntries] = useState<string[]>([]);
  const [statResult, setStatResult] = useState('not loaded');
  const [documentsDirectory, setDocumentsDirectory] = useState('not loaded');
  const [downloadsResult, setDownloadsResult] = useState('none');
  const [downloadResult, setDownloadResult] = useState('none');
  const saveToFilesButtonTitle =
    Platform.OS === 'android' ? 'Write to downloads' : 'Save to Files';

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      resolveReactNativeFilesystemDirectory(DOCUMENTS_DIRECTORY),
      resolveReactNativeFilesystemFilePath(DOCUMENTS_DIRECTORY, EXAMPLE_FILENAME),
    ])
      .then(([directoryPath, filePath]) => {
        if (!isMounted) {
          return;
        }

        setDocumentsDirectory(directoryPath);
        setDirectoryPath(directoryPath);
        setFilePath(filePath);
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

  async function runAction(
    actionName: string,
    action: () => Promise<void>,
  ) {
    try {
      await action();
      setStatus(`${actionName}: success`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`${actionName}: ${message}`);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Module API Example</Text>
        <Group name="Filesystem Harness">
          <Text testID="documents-directory">Documents directory: {documentsDirectory}</Text>

          <Text style={styles.label}>File path</Text>
          <TextInput
            testID="file-path-input"
            value={filePath}
            onChangeText={setFilePath}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>Directory path</Text>
          <TextInput
            testID="directory-path-input"
            value={directoryPath}
            onChangeText={setDirectoryPath}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.label}>Contents</Text>
          <TextInput
            testID="contents-input"
            multiline
            value={contents}
            onChangeText={setContents}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.multilineInput]}
          />

          <Text style={styles.label}>HTTPS URL</Text>
          <TextInput
            testID="download-url-input"
            value={downloadUrl}
            onChangeText={setDownloadUrl}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <View style={styles.buttonGroup}>
            <Button
              title="Use documents directory"
              onPress={async () => {
                if (!documentsDirectory || documentsDirectory.startsWith('Unavailable:')) {
                  setStatus('documentsDirectory: unavailable');
                  return;
                }

                const filePath = await resolveReactNativeFilesystemFilePath(
                  DOCUMENTS_DIRECTORY,
                  EXAMPLE_FILENAME,
                );
                setDirectoryPath(documentsDirectory);
                setFilePath(filePath);
                setStatus('documentsDirectory: applied');
              }}
            />
            <Button
              title="Use custom directory"
              onPress={() => {
                const customDirectoryPath = joinReactNativeFilesystemPath(
                  documentsDirectory.startsWith('Unavailable:')
                    ? FALLBACK_DIRECTORY_PATH
                    : documentsDirectory,
                  'custom',
                );
                const customDirectory = createCustomDirectory(
                  customDirectoryPath,
                );
                setDirectoryPath(customDirectoryPath);
                setFilePath(
                  joinReactNativeFilesystemPath(customDirectoryPath, EXAMPLE_FILENAME),
                );
                setStatus(`customDirectory: applied (${customDirectory.kind})`);
              }}
            />
            <Button
              title="Exists"
              onPress={() =>
                runAction('exists', async () => {
                  const exists = await ReactNativeFilesystem.exists(filePath);
                  setExistsResult(String(exists));
                })
              }
            />
            <Button
              title="Write file"
              onPress={() =>
                runAction('writeFile', async () => {
                  await ReactNativeFilesystem.writeFile(filePath, contents);
                })
              }
            />
            <Button
              title="Read file"
              onPress={() =>
                runAction('readFile', async () => {
                  const nextContents = await ReactNativeFilesystem.readFile(filePath);
                  setReadResult(nextContents);
                })
              }
            />
            <Button
              title="Download HTTPS file"
              onPress={() =>
                runAction('downloadFile', async () => {
                  const result = await ReactNativeFilesystem.downloadFile(
                    downloadUrl,
                    filePath,
                  );
                  setDownloadResult(JSON.stringify(result));
                  setReadResult(await ReactNativeFilesystem.readFile(filePath));
                })
              }
            />
            <Button
              title="Delete file"
              onPress={() =>
                runAction('deleteFile', async () => {
                  await ReactNativeFilesystem.deleteFile(filePath);
                })
              }
            />
            <Button
              title="Make directory"
              onPress={() =>
                runAction('mkdir', async () => {
                  await ReactNativeFilesystem.mkdir(directoryPath);
                })
              }
            />
            <Button
              title="Read directory"
              onPress={() =>
                runAction('readdir', async () => {
                  const entries = await ReactNativeFilesystem.readdir(directoryPath);
                  setDirectoryEntries(entries);
                })
              }
            />
            <Button
              title="Stat path"
              onPress={() =>
                runAction('stat', async () => {
                  const details = await ReactNativeFilesystem.stat(filePath);
                  setStatResult(JSON.stringify(details));
                })
              }
            />
            <Button
              title={saveToFilesButtonTitle}
              onPress={() =>
                runAction('writeFileToDownloads', async () => {
                  const result = await ReactNativeFilesystem.writeFileToDownloads(
                    'react-native-filesystem-example.txt',
                    contents,
                    'text/plain',
                  );
                  setDownloadsResult(result);
                  setFilePath(result);
                })
              }
            />
          </View>

          <Text testID="status-text">Status: {status}</Text>
          <Text testID="download-result">Download result: {downloadResult}</Text>
          <Text testID="downloads-result">Downloads result: {downloadsResult}</Text>
          <Text testID="exists-result">Exists: {existsResult}</Text>
          <Text testID="read-result">Read result: {readResult}</Text>
          <Text testID="readdir-result">
            Directory entries: {directoryEntries.join(', ') || 'none'}
          </Text>
          <Text testID="stat-result">Stat: {statResult}</Text>
        </Group>
        <Group name="Views">
          <ReactNativeFilesystemView
            url="https://www.example.com"
            onLoad={({ nativeEvent: { url } }: { nativeEvent: { url: string } }) =>
              console.log(`Loaded: ${url}`)
            }
            style={styles.view}
          />
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group(props: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{props.name}</Text>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 30,
    margin: 20,
  },
  groupHeader: {
    fontSize: 20,
    marginBottom: 20,
  },
  group: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderColor: '#c7d0db',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    gap: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#eee',
  },
  view: {
    flex: 1,
    height: 200,
  },
});
