import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatItem, LiveSettings } from '@claude-mobile/protocol';
import { ChatItemView, Markdown } from '@/components/ChatItemView';
import { Composer } from '@/components/Composer';
import { Icon, Spark } from '@/components/Icon';
import { PermissionCard } from '@/components/PermissionCard';
import { selectedModel, SettingsSheet } from '@/components/SettingsSheet';
import { IconButton, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { effortLabel, modelLabel } from '@/lib/format';
import { useChat, useLive } from '@/lib/live';
import { useTheme } from '@/theme';

const PAGE = 100;

type Row = ChatItem | { kind: 'draft'; id: string; text: string } | { kind: 'working'; id: string };

export default function ChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chat = useChat(id);
  const connected = useLive((s) => s.connected);
  const live = useLive.getState();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => live.subscribe(id), [id]);

  const history = useInfiniteQuery({
    queryKey: ['messages', id],
    queryFn: ({ pageParam }) => api.messages(id, pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.reduce((n, p) => n + p.items.length, 0) : undefined),
  });

  // When a turn ends, reload the transcript (canonical ids) and drop the live copies it now contains.
  useEffect(() => {
    if (!chat.turnsEnded) return;
    const timer = setTimeout(() => history.refetch().then(() => live.clearItems(id)), 600);
    return () => clearTimeout(timer);
  }, [chat.turnsEnded]);

  const session = history.data?.pages[0]?.session;
  const settings: LiveSettings | undefined = chat.settings;
  const working = chat.state !== 'idle';
  const model = selectedModel(chat.models, settings?.model);
  const modelText = [model?.displayName ?? modelLabel(settings?.model ?? session?.model), effortLabel(settings?.effort ?? session?.effort)]
    .filter(Boolean)
    .join(' · ');

  // Inverted list: newest first.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    if (chat.draft) out.push({ kind: 'draft', id: 'draft', text: chat.draft });
    else if (chat.state === 'working') out.push({ kind: 'working', id: 'working' });
    const stored = history.data?.pages.flatMap((p) => p.items) ?? [];
    const storedIds = new Set(stored.map((i) => i.id));
    // Live items keep the transcript's ids, so ones the history already has are skipped.
    out.push(...chat.items.filter((i) => !storedIds.has(i.id)).reverse());
    for (const page of history.data?.pages ?? []) out.push(...[...page.items].reverse());
    return out;
  }, [chat.draft, chat.state, chat.items, history.data]);

  const pending = chat.pending[0];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: t.line }]}>
        <IconButton name="back" label="Back to chats" onPress={() => router.back()} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: t.text }} numberOfLines={1}>
            {session?.title ?? ' '}
          </Text>
          <Text style={{ fontSize: 12, color: t.text3 }} numberOfLines={1}>
            {session?.projectName ?? ' '}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Model and effort" onPress={() => setSettingsOpen(true)} style={styles.model}>
          <Text style={{ fontSize: 14, color: t.text }} numberOfLines={1}>
            {modelText || 'Model'}
          </Text>
          <Icon name="chevronDown" size={14} color={t.text} strokeWidth={2} />
        </Pressable>
      </View>

      {history.isError ? <Notice text={(history.error as Error).message} action="Retry" onAction={() => history.refetch()} /> : null}
      {!connected && !history.isLoading ? <Notice text="Reconnecting to your Mac…" /> : null}
      {chat.error ? <Notice text={chat.error} /> : null}

      <FlatList
        inverted
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          item.kind === 'draft' ? (
            <Markdown value={item.text} />
          ) : item.kind === 'working' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Spark size={18} />
              <Text style={{ color: t.text2, fontSize: 15 }}>{chat.pending.length ? 'Waiting for you…' : 'Working…'}</Text>
            </View>
          ) : (
            <ChatItemView item={item} result={item.kind === 'tool' ? chat.toolResults[item.id] : undefined} />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => history.hasNextPage && !history.isFetchingNextPage && history.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={history.isFetchingNextPage || history.isLoading ? <ActivityIndicator color={t.text3} style={{ margin: 16 }} /> : null}
      />

      <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 8 }}>
        {pending ? (
          <PermissionCard
            pending={pending}
            onAnswer={(decision, extra) =>
              live.send({ type: 'permission', sessionId: id, requestId: pending.requestId, decision, message: extra?.message, answers: extra?.answers })
            }
          />
        ) : (
          <Composer
            working={working}
            commands={chat.commands}
            mode={settings?.permissionMode ?? 'default'}
            onSend={(text) => live.send({ type: 'send', sessionId: id, text })}
            onStop={() => live.send({ type: 'interrupt', sessionId: id })}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
      </View>

      <SettingsSheet
        visible={settingsOpen}
        settings={settings}
        models={chat.models}
        onChange={(change) => live.send({ type: 'settings', sessionId: id, ...change })}
        onClose={() => setSettingsOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingBottom: 6, borderBottomWidth: 0.5 },
  model: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 10, maxWidth: 170 },
});
