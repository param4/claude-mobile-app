import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LiveSettings } from '@claude-mobile/protocol';
import { Composer } from '@/components/Composer';
import { Icon, Spark } from '@/components/Icon';
import { selectedModel, SettingsSheet } from '@/components/SettingsSheet';
import { IconButton, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { effortLabel, modelLabel } from '@/lib/format';
import { fonts, useTheme } from '@/theme';

export default function NewChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { project, name } = useLocalSearchParams<{ project: string; name?: string }>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<LiveSettings>();

  const catalog = useQuery({ queryKey: ['catalog', project], queryFn: () => api.catalog(project) });
  useEffect(() => {
    if (catalog.data && !settings) setSettings(catalog.data.defaults);
  }, [catalog.data]);

  const create = useMutation({
    mutationFn: (text: string) => api.createSession({ project, text, ...settings }),
    onSuccess: ({ sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      router.replace({ pathname: '/session/[id]', params: { id: sessionId } });
    },
  });

  const models = catalog.data?.models ?? [];
  const model = selectedModel(models, settings?.model);
  const modelText = [model?.displayName ?? modelLabel(settings?.model), effortLabel(settings?.effort)].filter(Boolean).join(' · ');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: t.line }]}>
        <IconButton name="back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: t.text }}>New chat</Text>
          <Text style={{ fontSize: 12, color: t.text3 }} numberOfLines={1}>
            {name ?? project}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Model and effort" onPress={() => setSettingsOpen(true)} style={styles.model}>
          <Text style={{ fontSize: 14, color: t.text }} numberOfLines={1}>
            {modelText || 'Model'}
          </Text>
          <Icon name="chevronDown" size={14} color={t.text} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.empty}>
        <Spark size={40} />
        <Text style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 36, color: t.text, textAlign: 'center' }}>
          What should Claude work on{name && project !== 'no-folder' ? ` in ${name}` : ''}?
        </Text>
        <Text style={{ fontSize: 14, color: t.text3, textAlign: 'center' }}>It runs on your Mac and shows up in the desktop app too.</Text>
      </View>

      {catalog.isError ? <Notice text={(catalog.error as Error).message} action="Retry" onAction={() => catalog.refetch()} /> : null}
      {create.isError ? <Notice text={(create.error as Error).message} /> : null}

      <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 8 }}>
        <Composer
          working={create.isPending}
          commands={catalog.data?.commands ?? []}
          mode={settings?.permissionMode ?? 'default'}
          onSend={(text) => create.mutate(text)}
          onStop={() => {}}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </View>

      <SettingsSheet
        visible={settingsOpen}
        settings={settings}
        models={models}
        onChange={(change) => setSettings((s) => ({ permissionMode: 'default', ...s, ...change }))}
        onClose={() => setSettingsOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingBottom: 6, borderBottomWidth: 0.5 },
  model: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 10, maxWidth: 170 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
});
