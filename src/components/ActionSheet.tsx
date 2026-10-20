import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { fonts, useTheme } from '@/theme';

export type Action = {
  label: string;
  sub?: string;
  icon?: IconName;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

// A bottom sheet of actions; the sheet closes before the chosen action runs.
export function ActionSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
  children,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: Action[];
  onClose: () => void;
  children?: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.line3 }]} />
        {title ? (
          <View style={{ gap: 2, marginBottom: 6 }}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: t.text }} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? <Text style={{ fontSize: 13, color: t.text3 }} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        ) : null}
        {children}
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={[styles.list, { borderColor: t.line2 }]}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: a.disabled }}
              disabled={a.disabled}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={({ pressed }) => [styles.row, { borderBottomColor: t.line, opacity: a.disabled ? 0.45 : 1 }, pressed && { backgroundColor: t.hover }]}
            >
              {a.icon ? <Icon name={a.icon} size={20} color={a.danger ? t.danger : t.text2} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: a.danger ? t.danger : t.text }}>{a.label}</Text>
                {a.sub ? <Text style={{ fontSize: 13, color: t.text3 }}>{a.sub}</Text> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 4 },
  list: { borderWidth: 0.5, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 0.5 },
});
