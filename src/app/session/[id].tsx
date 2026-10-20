import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatItem, LiveSettings } from '@claude-mobile/protocol';
import { ActionSheet, type Action } from '@/components/ActionSheet';
import { ChatItemView, Markdown } from '@/components/ChatItemView';
import { Composer } from '@/components/Composer';
import { Icon, Spark } from '@/components/Icon';
import { PermissionCard } from '@/components/PermissionCard';
import { RewindSheet } from '@/components/RewindSheet';
import { selectedModel, SettingsSheet } from '@/components/SettingsSheet';
import { IconButton, Notice } from '@/components/ui';
import { api } from '@/lib/api';
import { effortLabel, modelLabel } from '@/lib/format';
import { useChat, useLive } from '@/lib/live';
import { useTheme } from '@/theme';

const PAGE = 100;

type Row = ChatItem | { kind: 'draft'; id: string; text: string } | { kind: 'working'; id: string };
type Edit = { messageId: string; text: string; files: boolean; key: number };

// Assistant items are "<entry uuid>:<block index>"; forks and rewinds need the entry uuid.
const entryId = (item: ChatItem) => (item.kind === 'assistant' ? item.id.split(':')[0]! : item.id);

export default function ChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id, prefill } = useLocalSearchParams<{ id: string; prefill?: string }>();
  const chat = useChat(id);
  const connected = useLive((s) => s.connected);
  const live = useLive.getState();
  const listRef = useRef<FlatList<Row>>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionItem, setActionItem] = useState<ChatItem>();
  const [rewindFor, setRewindFor] = useState<string>();
  const [edit, setEdit] = useState<Edit>();
  // After an edit or rewind, stored messages from this one on are hidden until the transcript reloads.
  const [cut, setCut] = useState<string>();
  const [finding, setFinding] = useState(false);
  const [needle, setNeedle] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const [busy, setBusy] = useState(false);

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
    const timer = setTimeout(
      () =>
        history.refetch().then(() => {
          live.clearItems(id);
          setCut(undefined);
        }),
      600,
    );
    return () => clearTimeout(timer);
  }, [chat.turnsEnded]);

  useEffect(() => {
    if (chat.error) setCut(undefined);
  }, [chat.error]);

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
    // Pages are offsets from the newest end, so they overlap when the transcript grows between fetches.
    const seen = new Set<string>();
    let stored = [...(history.data?.pages ?? [])]
      .reverse()
      .flatMap((p) => p.items)
      .filter((i) => !seen.has(i.id) && !!seen.add(i.id));
    const cutAt = cut ? stored.findIndex((i) => i.id === cut) : -1;
    if (cutAt >= 0) stored = stored.slice(0, cutAt);
    const storedIds = new Set(stored.map((i) => i.id));
    // Live items keep the transcript's ids, so ones the history already has are skipped.
    out.push(...chat.items.filter((i) => !storedIds.has(i.id)).reverse());
    out.push(...[...stored].reverse());
    return out;
  }, [chat.draft, chat.state, chat.items, history.data, cut]);

  // ---- Find in chat ----
  const query = useDeferredValue(needle.trim());
  const search = useQuery({
    queryKey: ['search', id, query],
    queryFn: () => api.search(id, query),
    enabled: finding && query.length > 1,
    placeholderData: (prev) => prev,
  });
  const matches = finding && query.length > 1 ? (search.data?.matches ?? []) : [];
  const current = matches[Math.min(matchIndex, matches.length - 1)];

  useEffect(() => setMatchIndex(0), [query]);

  // Load older pages until the current match is in the list, then scroll to it once.
  const scrolledTo = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!current || scrolledTo.current === current) return;
    const index = rows.findIndex((r) => r.id === current);
    if (index >= 0) {
      scrolledTo.current = current;
      listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
    } else if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
  }, [current, rows, history.hasNextPage, history.isFetchingNextPage]);

  // ---- Actions ----
  const send = (text: string, attachments: string[]) => {
    if (edit) {
      live.send({ type: 'send', sessionId: id, text, attachments, rewindTo: edit.messageId, rewindFiles: edit.files });
      setCut(edit.messageId);
      setEdit(undefined);
    } else live.send({ type: 'send', sessionId: id, text, attachments });
  };

  const fork = async (body: { upToMessageId?: string; before?: boolean }, prefillText?: string) => {
    setBusy(true);
    try {
      const { sessionId } = await api.fork(id, body);
      router.push({ pathname: '/session/[id]', params: prefillText ? { id: sessionId, prefill: prefillText } : { id: sessionId } });
    } catch (e) {
      Alert.alert("Couldn't fork", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const shareChat = async () => {
    try {
      const { title, markdown } = await api.exportChat(id);
      await Share.share({ title, message: markdown });
    } catch (e) {
      Alert.alert("Couldn't share", e instanceof Error ? e.message : String(e));
    }
  };

  const busyNote = working ? 'Stop Claude first' : undefined;
  const itemActions = (item: ChatItem): Action[] => {
    const copy: Action = { label: 'Copy', icon: 'copy', onPress: () => Clipboard.setStringAsync(item.kind === 'tool' ? item.summary : item.text) };
    if (item.kind === 'assistant') {
      return [copy, { label: 'Fork from here', sub: 'New chat up to this reply', icon: 'fork', onPress: () => fork({ upToMessageId: entryId(item) }) }];
    }
    if (item.kind !== 'user') return [copy];
    return [
      copy,
      {
        label: 'Edit and resend',
        sub: busyNote,
        icon: 'edit',
        disabled: working,
        onPress: () => setEdit({ messageId: item.id, text: item.text, files: false, key: Date.now() }),
      },
      {
        label: 'Retry',
        sub: busyNote ?? (item.images?.length || item.files?.length ? 'Sends the text again, without attachments' : 'Run this prompt again'),
        icon: 'retry',
        disabled: working || !item.text,
        onPress: () => {
          live.send({ type: 'send', sessionId: id, text: item.text, rewindTo: item.id });
          setCut(item.id);
        },
      },
      { label: 'Fork from here', sub: 'New chat with this message to edit', icon: 'fork', onPress: () => fork({ upToMessageId: item.id, before: true }, item.text) },
      { label: 'Rewind to here', sub: busyNote, icon: 'rewind', disabled: working, onPress: () => setRewindFor(item.id) },
    ];
  };

  const pending = chat.pending[0];
  const matchLabel = query.length > 1 ? (search.isFetching && !search.data ? '…' : matches.length ? `${matchIndex + 1} of ${matches.length}` : 'None') : '';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {finding ? (
        <View style={[styles.header, styles.findHeader, { paddingTop: insets.top + 4, borderBottomColor: t.line }]}>
          <View style={[styles.findField, { backgroundColor: t.card, borderColor: t.line2 }]}>
            <Icon name="search" size={16} color={t.text3} />
            <TextInput
              value={needle}
              onChangeText={setNeedle}
              placeholder="Find in chat"
              placeholderTextColor={t.text3}
              accessibilityLabel="Find in chat"
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={{ flex: 1, minWidth: 0, fontSize: 16, color: t.text, height: 40 }}
            />
            <Text style={{ fontSize: 13, color: t.text3, flexShrink: 0 }} numberOfLines={1}>
              {matchLabel}
            </Text>
          </View>
          <IconButton name="chevronUp" label="Older match" onPress={() => setMatchIndex((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)))} />
          <IconButton name="chevronDown" label="Newer match" onPress={() => setMatchIndex((i) => Math.max(i - 1, 0))} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFinding(false);
              setNeedle('');
            }}
            style={styles.done}
          >
            <Text style={{ fontSize: 15, color: t.text }}>Done</Text>
          </Pressable>
        </View>
      ) : (
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
          {busy ? <ActivityIndicator color={t.text3} style={{ width: 44 }} /> : <IconButton name="more" label="Chat menu" onPress={() => setMenuOpen(true)} />}
        </View>
      )}

      {history.isError ? <Notice text={(history.error as Error).message} action="Retry" onAction={() => history.refetch()} /> : null}
      {!connected && !history.isLoading ? <Notice text="Reconnecting to your Mac…" /> : null}
      {chat.error ? <Notice text={chat.error} /> : null}

      <FlatList
        ref={listRef}
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
            <ChatItemView
              item={item}
              result={item.kind === 'tool' ? chat.toolResults[item.id] : undefined}
              onLongPress={setActionItem}
              highlighted={item.id === current}
            />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => history.hasNextPage && !history.isFetchingNextPage && history.fetchNextPage()}
        onEndReachedThreshold={0.5}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.5 }), 120);
        }}
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
            key={edit ? `edit-${edit.key}` : 'main'}
            initialText={edit?.text ?? prefill ?? ''}
            banner={
              edit
                ? {
                    text: edit.files ? 'Editing. Later messages go, and files are restored.' : 'Editing. Messages after this one will be replaced.',
                    onCancel: () => setEdit(undefined),
                  }
                : undefined
            }
            working={working}
            commands={chat.commands}
            mode={settings?.permissionMode ?? 'default'}
            fastMode={settings?.fastMode}
            fileScope={{ session: id }}
            onSend={send}
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

      <ActionSheet
        visible={menuOpen}
        title={session?.title}
        subtitle={session?.projectName}
        onClose={() => setMenuOpen(false)}
        actions={[
          { label: 'Find in chat', icon: 'search', onPress: () => setFinding(true) },
          { label: 'Fork chat', sub: 'A copy of the whole chat', icon: 'fork', onPress: () => fork({}) },
          { label: 'Share transcript', sub: 'As Markdown', icon: 'share', onPress: shareChat },
          {
            label: settings?.fastMode ? 'Turn off fast mode' : 'Turn on fast mode',
            icon: 'bolt',
            onPress: () => live.send({ type: 'settings', sessionId: id, fastMode: !settings?.fastMode }),
          },
        ]}
      />

      <ActionSheet visible={!!actionItem} actions={actionItem ? itemActions(actionItem) : []} onClose={() => setActionItem(undefined)} />

      <RewindSheet
        sessionId={id}
        messageId={rewindFor}
        onClose={() => setRewindFor(undefined)}
        onConfirm={(files) => {
          const item = rows.find((r): r is Extract<ChatItem, { kind: 'user' }> => r.id === rewindFor && r.kind === 'user');
          if (item) setEdit({ messageId: item.id, text: item.text, files, key: Date.now() });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4, paddingBottom: 6, borderBottomWidth: 0.5 },
  findHeader: { paddingHorizontal: 12, gap: 0 },
  findField: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 0.5 },
  done: { height: 44, justifyContent: 'center', paddingHorizontal: 6 },
  model: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 6, maxWidth: 150 },
});
