import { SourceSerif4_400Regular, SourceSerif4_500Medium, useFonts } from '@expo-google-fonts/source-serif-4';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useConnection } from '@/lib/connection';
import { useTheme } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

export default function RootLayout() {
  const t = useTheme();
  const [fontsLoaded] = useFonts({ SourceSerif4_400Regular, SourceSerif4_500Medium });
  const loaded = useConnection((s) => s.loaded);
  const load = useConnection((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg);
  }, [t.bg]);

  if (!fontsLoaded || !loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </QueryClientProvider>
  );
}
