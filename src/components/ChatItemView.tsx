import { Fragment, memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMarkdown } from 'react-native-marked';
import type { ChatItem } from '@claude-mobile/protocol';
import { Icon } from './Icon';
import { fonts, useTheme, type Theme } from '@/theme';

type ToolResult = NonNullable<Extract<ChatItem, { kind: 'tool' }>['result']>;

export function Markdown({ value }: { value: string }) {
  const t = useTheme();
  const elements = useMarkdown(value, {
    colorScheme: t.dark ? 'dark' : 'light',
    theme: { colors: { text: t.text, link: t.clayText, border: t.line2, code: t.code } },
    styles: markdownStyles(t),
  });
  return (
    <View>
      {elements.map((el, i) => (
        <Fragment key={i}>{el}</Fragment>
      ))}
    </View>
  );
}

function markdownStyles(t: Theme) {
  return {
    text: { fontFamily: fonts.serifBody, fontSize: 17, lineHeight: 26, color: t.text },
    strong: { fontFamily: 'SourceSerif4_500Medium', fontWeight: '600' as const },
    paragraph: { paddingVertical: 4 },
    h1: { fontFamily: fonts.serif, fontSize: 24, color: t.text },
    h2: { fontFamily: fonts.serif, fontSize: 21, color: t.text },
    h3: { fontFamily: fonts.serif, fontSize: 18, color: t.text },
    codespan: { fontFamily: fonts.mono, fontStyle: 'normal' as const, fontSize: 14, backgroundColor: t.code, color: t.text },
    code: { backgroundColor: t.code, borderRadius: 10, padding: 12 },
    codeText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: t.text },
    li: { fontFamily: fonts.serifBody, fontSize: 17, lineHeight: 26, color: t.text },
    link: { color: t.clayText },
  };
}

// mcp__Claude_Browser__browser_batch -> browser_batch
function toolLabel(name: string): string {
  return name.startsWith('mcp__') ? name.split('__').slice(2).join('__') || name : name;
}

function ToolCard({ item: base, result }: { item: Extract<ChatItem, { kind: 'tool' }>; result?: ToolResult }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const item = result && !base.result ? { ...base, result } : base;
  const status = item.result ? (item.result.isError ? 'Error' : '') : 'Running';
  return (
    <View style={[styles.card, { borderColor: t.line2, backgroundColor: t.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.toolRow}
      >
        <Icon name="terminal" size={16} color={t.text3} />
        <Text style={{ flexShrink: 1, fontSize: 14, fontWeight: '500', color: t.text }} numberOfLines={1}>
          {toolLabel(item.name)}
        </Text>
        <Text style={{ flex: 1, fontFamily: fonts.mono, fontSize: 12.5, color: t.text2 }} numberOfLines={1}>
          {item.summary}
        </Text>
        {status ? <Text style={{ fontSize: 12, color: item.result?.isError ? t.danger : t.text3 }}>{status}</Text> : null}
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevronRight" size={14} color={t.text3} strokeWidth={2} />
        </View>
      </Pressable>
      {open ? (
        <View style={{ backgroundColor: t.code, borderTopWidth: 0.5, borderTopColor: t.line, padding: 12 }}>
          {item.summary && item.name === 'Bash' ? (
            <Text selectable style={[styles.mono, { color: t.text, marginBottom: 8 }]}>
              $ {item.summary}
            </Text>
          ) : null}
          <Text selectable style={[styles.mono, { color: t.text2 }]}>
            {item.result?.text || (item.result ? '(no output)' : 'Waiting for result…')}
            {item.result?.truncated ? '\n…' : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Thinking({ text }: { text: string }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, color: t.text3 }}>{open ? 'Thought ▾' : 'Thought ▸'}</Text>
      {open ? <Text style={{ fontSize: 14, lineHeight: 20, color: t.text2 }}>{text}</Text> : null}
    </Pressable>
  );
}

export const ChatItemView = memo(function ChatItemView({ item, result }: { item: ChatItem; result?: ToolResult }) {
  const t = useTheme();
  switch (item.kind) {
    case 'user':
      return (
        <View style={[styles.bubble, { backgroundColor: t.bubble }]}>
          <Text selectable style={{ fontSize: 16, lineHeight: 23, color: t.text }}>
            {item.text}
          </Text>
        </View>
      );
    case 'assistant':
      return <Markdown value={item.text} />;
    case 'thinking':
      return <Thinking text={item.text} />;
    case 'tool':
      return <ToolCard item={item} result={result} />;
  }
});

const styles = StyleSheet.create({
  bubble: { alignSelf: 'flex-end', maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  card: { borderWidth: 0.5, borderRadius: 14, overflow: 'hidden' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12 },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18 },
});
