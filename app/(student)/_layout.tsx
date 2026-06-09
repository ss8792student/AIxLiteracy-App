import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="library" />
      <Stack.Screen name="reading/[bookId]" />
      <Stack.Screen name="feedback/[sessionId]" />
      <Stack.Screen name="practice/[sessionId]" />
      <Stack.Screen name="progress" />
    </Stack>
  );
}
