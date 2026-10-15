import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CommandInfo, PermissionMode } from '@claude-mobile/protocol';
import { Icon } from './Icon';
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

export function Composer({
  working,
  commands,
  mode,
  onSend,
  onStop,
  onOpenSettings,
}: {
  working: boolean;
  commands: CommandInfo[];
  mode: PermissionMode;
  onSend: (text: string) => void;
  onStop: () => void;
  onOpenSettings: () => void;
}) {
  const t = useTheme();
  const [text, setText] = useState('');

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

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText('');
  };

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

      <View style={[styles.box, { backgroundColor: t.card, borderColor: t.line2 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Reply to Claude…"
          placeholderTextColor={t.text3}
          accessibilityLabel="Message"
          multiline
          autoCapitalize="sentences"
          style={[styles.input, { color: t.text }]}
        />
        <View style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Slash commands" onPress={() => setText(text.startsWith('/') ? text : `/${text}`)} style={styles.iconBtn}>
            <Icon name="slash" size={20} color={t.text2} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onOpenSettings} style={[styles.mode, { backgroundColor: t.hover }]}>
            <Icon name="shield" size={14} color={t.text} />
            <Text style={{ fontSize: 13, color: mode === 'bypassPermissions' ? t.danger : t.text }}>{modeLabels[mode]}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Dictate (coming soon)" disabled style={[styles.iconBtn, { opacity: 0.4 }]}>
            <Icon name="mic" size={20} color={t.text2} />
          </Pressable>
          {working && !text.trim() ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Stop" onPress={onStop} style={[styles.action, { backgroundColor: t.text }]}>
              <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: t.bg }} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={submit}
              disabled={!text.trim()}
              style={[styles.action, { backgroundColor: t.clay, opacity: text.trim() ? 1 : 0.4 }]}
            >
              <Icon name="arrowUp" size={20} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 0.5, borderRadius: 22, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 6, gap: 4 },
  input: { fontSize: 16, lineHeight: 22, maxHeight: 160, paddingHorizontal: 8, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999 },
  action: { width: 40, height: 40, margin: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  palette: { borderWidth: 0.5, borderRadius: 18, padding: 6 },
  command: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 10, borderRadius: 12 },
});
