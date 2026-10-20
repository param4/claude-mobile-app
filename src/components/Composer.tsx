import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CommandInfo, PermissionMode } from '@claude-mobile/protocol';
import { ActionSheet } from './ActionSheet';
import { Icon } from './Icon';
import { api } from '@/lib/api';
import { MAX_ATTACHMENTS, pasteImage, pickFiles, pickPhotos, takePhoto, useAttachments, type Attachment } from '@/lib/attachments';
import { fonts, useTheme } from '@/theme';

export const modeLabels: Record<PermissionMode, string> = {
  default: 'Ask before edits',
  acceptEdits: 'Accept edits',
  plan: 'Plan mode',
  auto: 'Auto',
  bypassPermissions: 'Bypass permissions',
  dontAsk: "Don't ask",
};

// Skill descriptions arrive HTML-escaped.
const unescape = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// "@que" at the end of the text, while a file mention is being typed.
const MENTION = /(^|\s)@([^\s@]*)$/;

export type FileScope = { session?: string; project?: string };

export function Composer({
  working,
  commands,
  mode,
  onSend,
  onStop,
  onOpenSettings,
  fileScope,
  initialText = '',
  banner,
  fastMode,
  placeholder = 'Reply to Claude…',
}: {
  working: boolean;
  commands: CommandInfo[];
  mode: PermissionMode;
  onSend: (text: string, attachments: string[]) => void;
  onStop: () => void;
  onOpenSettings: () => void;
  fileScope?: FileScope;
  initialText?: string;
  banner?: { text: string; onCancel: () => void };
  fastMode?: boolean;
  placeholder?: string;
}) {
  const t = useTheme();
  const [text, setText] = useState(initialText);
  const [attachOpen, setAttachOpen] = useState(false);
  const att = useAttachments();

  // The palette shows while the first word is a slash command being typed.
  const slashQuery = /^\/(\S*)$/.exec(text)?.[1];
  const matches = useMemo(() => {
    if (slashQuery === undefined) return [];
    const q = slashQuery.toLowerCase();
    return commands
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
      .slice(0, 30);
  }, [slashQuery, commands]);

  const mention = fileScope ? MENTION.exec(text)?.[2] : undefined;
  const files = useQuery({
    queryKey: ['files', fileScope, mention],
    queryFn: () => api.files(fileScope!, mention ?? ''),
    enabled: mention !== undefined,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
  const fileHits = mention !== undefined ? (files.data?.files ?? []) : [];

  const pickMention = (path: string) => setText(text.replace(MENTION, (_m, lead) => `${lead}@${path} `));

  const canSend = (!!text.trim() || att.ids.length > 0) && !att.busy;
  const submit = () => {
    if (!canSend) return;
    onSend(text.trim(), att.ids);
    setText('');
    att.clear();
  };

  const attach = (pick: Parameters<typeof att.add>[0]) =>
    att.add(pick).catch((e) => Alert.alert("Couldn't attach", e instanceof Error ? e.message : String(e)));
  const room = MAX_ATTACHMENTS - att.items.length;

  return (
    <View style={{ gap: 8 }}>
      {matches.length ? (
        <View style={[styles.palette, { backgroundColor: t.card, borderColor: t.line2 }]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 280 }}>
            {matches.map((c) => (
              <Pressable
                key={c.name}
                accessibilityRole="button"
                onPress={() => setText(`/${c.name} `)}
                style={({ pressed }) => [styles.command, pressed && { backgroundColor: t.hover }]}
              >
                <Text style={{ fontFamily: fonts.mono, fontSize: 14, color: t.text }}>/{c.name}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: t.text2 }} numberOfLines={1}>
                  {unescape(c.description)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {fileHits.length ? (
        <View style={[styles.palette, { backgroundColor: t.card, borderColor: t.line2 }]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 280 }}>
            {fileHits.map((f) => {
              const slash = f.lastIndexOf('/');
              return (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  accessibilityLabel={`Mention ${f}`}
                  onPress={() => pickMention(f)}
                  style={({ pressed }) => [styles.command, pressed && { backgroundColor: t.hover }]}
                >
                  <Icon name="file" size={18} color={t.text3} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 14, color: t.text }} numberOfLines={1}>
                      {f.slice(slash + 1)}
                    </Text>
                    {slash > 0 ? (
                      <Text style={{ fontSize: 12, color: t.text3 }} numberOfLines={1}>
                        {f.slice(0, slash)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {banner ? (
        <View style={[styles.banner, { backgroundColor: t.clayTint }]}>
          <Icon name="edit" size={16} color={t.clayText} />
          <Text style={{ flex: 1, fontSize: 14, color: t.clayText }} numberOfLines={2}>
            {banner.text}
          </Text>
          <Pressable accessibilityRole="button" onPress={banner.onCancel} hitSlop={8}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.clayText }}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.box, { backgroundColor: t.card, borderColor: t.line2 }]}>
        {att.items.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {att.items.map((a) => (
              <AttachmentChip key={a.key} item={a} onRemove={() => att.remove(a.key)} />
            ))}
          </ScrollView>
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={t.text3}
          accessibilityLabel="Message"
          multiline
          autoCapitalize="sentences"
          style={[styles.input, { color: t.text }]}
        />
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
            disabled={room <= 0}
            onPress={() => setAttachOpen(true)}
            style={[styles.iconBtn, room <= 0 && { opacity: 0.4 }]}
          >
            <Icon name="plus" size={20} color={t.text2} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Slash commands" onPress={() => setText(text.startsWith('/') ? text : `/${text}`)} style={styles.iconBtn}>
            <Icon name="slash" size={20} color={t.text2} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOpenSettings} style={[styles.mode, { backgroundColor: t.hover }]}>
            <Icon name="shield" size={14} color={t.text} />
            <Text style={{ fontSize: 13, color: mode === 'bypassPermissions' ? t.danger : t.text }} numberOfLines={1}>
              {modeLabels[mode]}
            </Text>
          </Pressable>
          {fastMode ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Fast mode is on" onPress={onOpenSettings} style={[styles.fast, { backgroundColor: t.primary }]}>
              <Icon name="bolt" size={14} color={t.onPrimary} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }} />
          {working && !canSend ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Stop" onPress={onStop} style={[styles.action, { backgroundColor: t.text }]}>
              <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: t.bg }} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={submit}
              disabled={!canSend}
              style={[styles.action, { backgroundColor: t.clay, opacity: canSend ? 1 : 0.4 }]}
            >
              <Icon name="arrowUp" size={20} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      </View>

      <ActionSheet
        visible={attachOpen}
        title="Add to message"
        onClose={() => setAttachOpen(false)}
        actions={[
          { label: 'Photos', icon: 'image', onPress: () => attach(() => pickPhotos(room)) },
          { label: 'Camera', icon: 'camera', onPress: () => attach(takePhoto) },
          { label: 'Files', icon: 'file', onPress: () => attach(pickFiles) },
          { label: 'Paste image', sub: 'From the clipboard', icon: 'clipboard', onPress: () => attach(pasteImage) },
          ...(fileScope
            ? [{ label: 'Mention a file on your Mac', sub: "Search this project's files", icon: 'at' as const, onPress: () => setText(/\s$|^$/.test(text) ? `${text}@` : `${text} @`) }]
            : []),
        ]}
      />
    </View>
  );
}

function AttachmentChip({ item, onRemove }: { item: Attachment; onRemove: () => void }) {
  const t = useTheme();
  const failed = item.status === 'error';
  return (
    <View style={{ paddingTop: 6, paddingRight: 6 }}>
      {item.kind === 'image' ? (
        <View style={[styles.thumb, { backgroundColor: t.fill, borderColor: failed ? t.danger : 'transparent' }]}>
          <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} accessibilityLabel={item.name} />
          {item.status === 'uploading' ? <ActivityIndicator color={t.clay} /> : null}
        </View>
      ) : (
        <View style={[styles.fileChip, { backgroundColor: t.code, borderColor: failed ? t.danger : 'transparent' }]}>
          {item.status === 'uploading' ? <ActivityIndicator size="small" color={t.clay} /> : <Icon name="file" size={18} color={t.text2} />}
          <Text style={{ fontSize: 13, fontWeight: '500', color: t.text, maxWidth: 140 }} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      )}
      {failed ? (
        <Text style={{ fontSize: 11, color: t.danger, maxWidth: 140 }} numberOfLines={1}>
          {item.error}
        </Text>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} onPress={onRemove} hitSlop={10} style={[styles.remove, { backgroundColor: t.text, borderColor: t.card }]}>
        <Icon name="close" size={10} color={t.bg} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 0.5, borderRadius: 22, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 6, gap: 4 },
  input: { fontSize: 16, lineHeight: 22, maxHeight: 160, paddingHorizontal: 8, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, flexShrink: 1 },
  fast: { width: 36, height: 36, marginLeft: 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  action: { width: 40, height: 40, margin: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  palette: { borderWidth: 0.5, borderRadius: 18, padding: 6 },
  command: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 10, borderRadius: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  chips: { gap: 4, paddingHorizontal: 6 },
  thumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  fileChip: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5 },
  remove: { position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
