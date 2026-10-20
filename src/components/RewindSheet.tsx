import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat, useLive } from '@/lib/live';
import { fonts, useTheme } from '@/theme';

// Rewind to a user message: conversation only, or conversation and the files Claude changed since.
export function RewindSheet({
  sessionId,
  messageId,
  onConfirm,
  onClose,
}: {
  sessionId: string;
  messageId?: string;
  onConfirm: (withFiles: boolean) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const preview = useChat(sessionId).rewindPreviews[messageId ?? ''];
  const [withFiles, setWithFiles] = useState(false);

  useEffect(() => {
    if (!messageId) return;
    setWithFiles(false);
    useLive.getState().send({ type: 'rewind_preview', sessionId, messageId });
  }, [messageId, sessionId]);

  const changed = preview?.filesChanged ?? [];
  const codeDesc = !preview
    ? 'Checking what changed…'
    : !preview.canRewind
      ? (preview.error ?? "Files can't be restored to this point.")
      : changed.length
        ? `Also undo ${changed.length} file ${changed.length === 1 ? 'change' : 'changes'} Claude made after this message.`
        : 'No files changed after this message.';
  const codeEnabled = !!preview?.canRewind && changed.length > 0;

  const options = [
    { files: false, title: 'Conversation only', desc: 'Files on your Mac stay as they are now.', enabled: true },
    { files: true, title: 'Conversation and code', desc: codeDesc, enabled: codeEnabled },
  ];

  return (
    <Modal visible={!!messageId} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.line3 }]} />
        <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: t.text }}>Rewind to this message?</Text>
        <Text style={{ fontSize: 15, lineHeight: 21, color: t.text2 }}>Everything after it leaves the chat. You can edit the message before sending it again.</Text>

        {options.map((o) => {
          const on = withFiles === o.files;
          return (
            <Pressable
              key={o.title}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: !o.enabled }}
              disabled={!o.enabled}
              onPress={() => setWithFiles(o.files)}
              style={[styles.option, on ? { borderColor: t.clay, borderWidth: 1.5, backgroundColor: t.clayTint } : { borderColor: t.line2 }, !o.enabled && { opacity: 0.55 }]}
            >
              <View style={[styles.dot, { borderColor: on ? t.clay : t.text3, borderWidth: on ? 5 : 1.5 }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: t.text }}>{o.title}</Text>
                <Text style={{ fontSize: 14, lineHeight: 19, color: t.text2 }}>{o.desc}</Text>
              </View>
              {o.files && !preview ? <ActivityIndicator color={t.text3} /> : null}
            </Pressable>
          );
        })}

        {withFiles && changed.length ? (
          <ScrollView style={[styles.files, { backgroundColor: t.code }]}>
            {changed.map((f) => (
              <Text key={f} style={{ fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 20, color: t.text }} numberOfLines={1}>
                {f}
              </Text>
            ))}
            {preview?.insertions !== undefined ? (
              <Text style={{ fontFamily: fonts.mono, fontSize: 12.5, marginTop: 4, color: t.text2 }}>
                +{preview.insertions} −{preview.deletions ?? 0}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={onClose} style={[styles.button, { flex: 1, borderWidth: 0.5, borderColor: t.line3 }]}>
            <Text style={{ fontSize: 15, color: t.text }}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onConfirm(withFiles);
              onClose();
            }}
            style={[styles.button, { flex: 2, backgroundColor: t.primary }]}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: t.onPrimary }}>Rewind and edit</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 14, borderWidth: 0.5 },
  dot: { width: 18, height: 18, borderRadius: 9, marginTop: 2 },
  files: { maxHeight: 140, borderRadius: 12, padding: 12 },
  button: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
