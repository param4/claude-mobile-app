import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Effort, LiveSettings, ModelOption, PermissionMode } from '@claude-mobile/protocol';
import { modeLabels } from './Composer';
import { Icon } from './Icon';
import { fonts, useTheme } from '@/theme';

const modeHelp: Record<PermissionMode, string> = {
  default: 'Approve each edit and command',
  acceptEdits: 'Edits run; commands still ask',
  plan: 'Read and plan, no changes',
  auto: 'Claude decides what needs asking',
  bypassPermissions: 'Nothing asks. Use with care',
  dontAsk: 'Deny anything not pre-approved',
};
const modes: PermissionMode[] = ['default', 'acceptEdits', 'plan', 'auto', 'bypassPermissions'];
const effortLabels: Record<Effort, string> = { low: 'Low', medium: 'Med', high: 'High', xhigh: 'XHigh', max: 'Max' };
const allEfforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

export function selectedModel(models: ModelOption[], current?: string) {
  return models.find((m) => m.value === current) ?? models.find((m) => m.resolvedModel === current);
}

export function SettingsSheet({
  visible,
  settings,
  models,
  onChange,
  onClose,
}: {
  visible: boolean;
  settings?: LiveSettings;
  models: ModelOption[];
  onChange: (change: Partial<LiveSettings>) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = useState(false);
  const model = selectedModel(models, settings?.model);
  const efforts = model?.efforts.length ? model.efforts : allEfforts;
  // Aliases (opus, sonnet…) track the latest version; pinned older versions sit behind "More models".
  const isAlias = (m: ModelOption) => !/\d/.test(m.value);
  const shown = showAll ? models : models.filter((m) => isAlias(m) || m === model);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.grabber, { backgroundColor: t.line3 }]} />
        <View style={styles.header}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: t.text }}>Session settings</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.done}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: t.text }}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
          <Section title="Model">
            {models.length ? (
              <View style={[styles.list, { borderColor: t.line2 }]}>
                {shown.map((m) => (
                  <Row key={m.value} title={m.displayName} subtitle={m.description} on={m === model} onPress={() => onChange({ model: m.value })} />
                ))}
                {shown.length < models.length || showAll ? (
                  <Pressable accessibilityRole="button" onPress={() => setShowAll(!showAll)} style={styles.more}>
                    <Text style={{ fontSize: 15, color: t.text2 }}>{showAll ? 'Fewer models' : 'More models'}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={{ color: t.text3, fontSize: 14 }}>Loading models…</Text>
            )}
          </Section>

          <Section title="Effort">
            <View style={[styles.segments, { backgroundColor: t.fill }]}>
              {efforts.map((e) => {
                const on = settings?.effort === e;
                return (
                  <Pressable
                    key={e}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => onChange({ effort: e })}
                    style={[styles.segment, on && { backgroundColor: t.card }]}
                  >
                    <Text style={{ fontSize: 14, color: t.text }}>{effortLabels[e]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Speed">
            <View style={[styles.list, styles.fastRow, { borderColor: t.line2 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: t.text }}>Fast mode</Text>
                <Text style={{ fontSize: 13, color: t.text3 }}>Quicker replies; uses your plan faster</Text>
              </View>
              <Switch
                accessibilityLabel="Fast mode"
                value={!!settings?.fastMode}
                onValueChange={(fastMode) => onChange({ fastMode })}
                trackColor={{ true: t.clay }}
              />
            </View>
          </Section>

          <Section title="Permissions">
            <View style={[styles.list, { borderColor: t.line2 }]}>
              {modes.map((m) => (
                <Row
                  key={m}
                  title={modeLabels[m]}
                  subtitle={modeHelp[m]}
                  danger={m === 'bypassPermissions'}
                  on={settings?.permissionMode === m}
                  onPress={() => onChange({ permissionMode: m })}
                />
              ))}
            </View>
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: '500', color: t.text2 }}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ title, subtitle, on, danger, onPress }: { title: string; subtitle: string; on: boolean; danger?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.row, { borderBottomColor: t.line, backgroundColor: on ? t.hover : 'transparent' }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: danger ? t.danger : t.text }}>{title}</Text>
        <Text style={{ fontSize: 13, color: t.text3 }}>{subtitle}</Text>
      </View>
      {on ? <Icon name="check" size={20} color={t.text} strokeWidth={2} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  done: { height: 44, justifyContent: 'center', paddingHorizontal: 4 },
  list: { borderWidth: 0.5, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 0.5 },
  fastRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 6 },
  more: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  segments: { flexDirection: 'row', gap: 2, padding: 3, borderRadius: 12 },
  segment: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
});
