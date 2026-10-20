import { Fragment, memo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMarkdown } from 'react-native-marked';
import type { ChatItem } from '@claude-mobile/protocol';
import { Icon } from './Icon';
import { imageSource } from '@/lib/api';
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

function UserMessage({ item, onLongPress }: { item: Extract<ChatItem, { kind: 'user' }>; onLongPress?: () => void }) {
  const t = useTheme();
  const [viewing, setViewing] = useState<string>();
  return (
    <View style={{ alignSelf: 'flex-end', maxWidth: '85%', alignItems: 'flex-end', gap: 6 }}>
      {item.images?.length ? (
        <View style={styles.images}>
          {item.images.map((img) => (
            <Pressable key={img.url} accessibilityRole="imagebutton" accessibilityLabel="Open image" onPress={() => setViewing(img.url)} onLongPress={onLongPress}>
              <Image source={imageSource(img.url)} style={[styles.image, { backgroundColor: t.fill }]} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}
      {item.files?.length ? (
        <View style={styles.images}>
          {item.files.map((f) => (
            <View key={f} style={[styles.file, { backgroundColor: t.code }]}>
              <Icon name="file" size={16} color={t.text2} />
              <Text style={{ fontSize: 13, color: t.text, maxWidth: 180 }} numberOfLines={1}>
                {f}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {item.text ? (
        <Pressable onLongPress={onLongPress} delayLongPress={350} style={[styles.bubble, { backgroundColor: t.bubble }]}>
          <Text style={{ fontSize: 16, lineHeight: 23, color: t.text }}>{item.text}</Text>
        </Pressable>
      ) : null}
      {viewing ? <ImageViewer url={viewing} onClose={() => setViewing(undefined)} /> : null}
    </View>
  );
}

function ImageViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView maximumZoomScale={4} minimumZoomScale={1} centerContent contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <Image source={imageSource(url)} style={{ width: '100%', aspectRatio: 0.75 }} resizeMode="contain" accessibilityLabel="Attached image" />
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Close image" onPress={onClose} style={[styles.closeImage, { top: insets.top + 8 }]}>
          <Icon name="close" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

export const ChatItemView = memo(function ChatItemView({
  item,
  result,
  onLongPress,
  highlighted,
}: {
  item: ChatItem;
  result?: ToolResult;
  onLongPress?: (item: ChatItem) => void;
  highlighted?: boolean;
}) {
  const t = useTheme();
  const press = onLongPress ? () => onLongPress(item) : undefined;
  const view = (() => {
    switch (item.kind) {
      case 'user':
        return <UserMessage item={item} onLongPress={press} />;
      case 'assistant':
        return (
          <Pressable onLongPress={press} delayLongPress={350}>
            <Markdown value={item.text} />
          </Pressable>
        );
      case 'thinking':
        return <Thinking text={item.text} />;
      case 'tool':
        return <ToolCard item={item} result={result} />;
    }
  })();
  return highlighted ? <View style={[styles.highlight, { borderColor: t.clay, backgroundColor: t.clayTint }]}>{view}</View> : view;
});

const styles = StyleSheet.create({
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  images: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  image: { width: 120, height: 120, borderRadius: 14 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 40, borderRadius: 12 },
  closeImage: { position: 'absolute', right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  highlight: { borderWidth: 1.5, borderRadius: 16, padding: 8, margin: -9 },
  card: { borderWidth: 0.5, borderRadius: 14, overflow: 'hidden' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12 },
  mono: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18 },
});
