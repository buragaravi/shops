import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to tabs layout
  return <Redirect href="/(tabs)" />;
}
