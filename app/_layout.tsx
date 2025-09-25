import { AuthProvider } from '@/context/AuthContext';
import { SeasonFilterProvider } from '@/context/SeasonFilterContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { STACK_ANIM } from '@/navigation/stackAnim';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SeasonFilterProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={STACK_ANIM} />
          </SeasonFilterProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
