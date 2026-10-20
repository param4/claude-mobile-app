import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LiveSettings, Preset } from '@claude-mobile/protocol';
import { Composer } from '@/components/Composer';
import { Icon, Spark } from '@/components/Icon';
import { selectedModel, SettingsSheet } from '@/components/SettingsSheet';
import { IconButton, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { useFolderPick } from '@/lib/folderPick';
import { effortLabel, modelLabel } from '@/lib/format';
import { fonts, useTheme } from '@/theme';

const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1) || p;

export default function NewChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ project: string; name?: string }>();
  const [project, setProject] = useState(params.project);
  const [name, setName] = useState(params.name ?? params.project);
  const [presetId, setPresetId] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<LiveSettings>();

  const catalog = useQuery({ queryKey: ['catalog', project], queryFn: () => api.catalog(project) });
  const presets = useQuery({ queryKey: ['presets'], queryFn: api.presets, staleTime: 60_000 });
  useEffect(() => {
    if (catalog.data && !settings) setSettings(catalog.data.defaults);
  }, [catalog.data]);

  // A folder chosen in the folder picker opened from this screen.
  const picked = useFolderPick((s) => s.picked);
  const openedAt = useRef(Date.now());
  useEffect(() => {
    if (!picked || picked.nonce < openedAt.current) return;
    setProject(picked.path);
    setName(picked.name);
    setPresetId(undefined);
  }, [picked?.nonce]);

  const applyPreset = (p: Preset) => {
    setPresetId(p.id);
    setProject(p.cwd);
    setName(baseName(p.cwd));
    setSettings((s) => ({
      permissionMode: 'default',
      ...s,
      ...(p.model ? { model: p.model } : {}),
      ...(p.effort ? { effort: p.effort } : {}),
      ...(p.fastMode !== undefined ? { fastMode: p.fastMode } : {}),
    }));
  };

  const create = useMutation({
    mutationFn: ({ text, attachments }: { text: string; attachments: string[] }) => api.createSession({ project, text, attachments, ...settings }),
    onSuccess: ({ sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      router.replace({ pathname: '/session/[id]', params: { id: sessionId } });
    },
  });

  const models = catalog.data?.models ?? [];
  const model = selectedModel(models, settings?.model);
  const modelText = [model?.displayName ?? modelLabel(settings?.model), effortLabel(settings?.effort)].filter(Boolean).join(' · ');
  const noFolder = project === 'no-folder';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: t.line }]}>
        <IconButton name="back" label="Back" onPress={() => router.back()} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Folder: ${noFolder ? 'No folder' : name}. Change`}
          onPress={() => router.push({ pathname: '/folders', params: { mode: 'pick' } })}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '500', color: t.text }}>New chat</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12, color: t.text3, flexShrink: 1 }} numberOfLines={1}>
              {noFolder ? 'No folder' : name}
            </Text>
            <Icon name="chevronDown" size={12} color={t.text3} strokeWidth={2} />
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Model and effort" onPress={() => setSettingsOpen(true)} style={styles.model}>
          <Text style={{ fontSize: 14, color: t.text }} numberOfLines={1}>
            {modelText || 'Model'}
          </Text>
          <Icon name="chevronDown" size={14} color={t.text} strokeWidth={2} />
        </Pressable>
      </View>

      {presets.data?.presets.length ? (
        <View style={{ paddingTop: 12, gap: 8 }}>
          <Text style={{ paddingHorizontal: 20, fontSize: 13, fontWeight: '500', color: t.text2 }}>Presets from your Mac</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
            {presets.data.presets.map((p) => {
              const on = presetId === p.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => applyPreset(p)}
                  style={[styles.preset, on ? { borderColor: t.clay, borderWidth: 1.5, backgroundColor: t.clayTint } : { borderColor: t.line2, backgroundColor: t.card }]}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: t.text }}>{p.name}</Text>
                  <Text style={{ fontSize: 12, color: t.text3 }}>{[modelLabel(p.model), effortLabel(p.effort), p.fastMode ? 'Fast' : undefined].filter(Boolean).join(' · ') || baseName(p.cwd)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.empty}>
        <Spark size={40} />
        <Text style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 36, color: t.text, textAlign: 'center' }}>
          What should Claude work on{!noFolder ? ` in ${name}` : ''}?
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
          fastMode={settings?.fastMode}
          fileScope={noFolder ? undefined : { project }}
          placeholder="Describe a task…"
          onSend={(text, attachments) => create.mutate({ text, attachments })}
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
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, gap: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
});
