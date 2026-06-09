import { AudioModule } from 'expo-audio';
import { Paths, Directory, File } from 'expo-file-system';
import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';

export async function requestAudioPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const status = await AudioModule.requestRecordingPermissionsAsync();
  return status.granted;
}

function getRecordingsDir(): Directory {
  return new Directory(Paths.document, 'recordings');
}

export async function ensureRecordingDirectory(): Promise<void> {
  if (Platform.OS === 'web') return;
  const dir = getRecordingsDir();
  if (!dir.exists) {
    dir.create();
  }
}

export function buildRecordingPath(): string {
  const file = new File(getRecordingsDir(), `${randomUUID()}.m4a`);
  return file.uri;
}

export async function deleteRecording(path: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const file = new File(path);
  if (file.exists) {
    file.delete();
  }
}
