import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { fonts, useTheme } from '@/theme';

export function IconButton({ name, label, onPress, color }: { name: IconName; label: string; onPress?: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={styles.iconButton}>
      <Icon name={name} color={color ?? t.text} />
    </Pressable>
  );
}

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (s: string) => void; placeholder: string }) {
  const t = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: t.card, borderColor: t.line2 }]}>
      <Icon name="search" size={18} color={t.text3} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.text3}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        style={[styles.searchInput, { color: t.text }]}
      />
    </View>
  );
}

export function Chip({ label, value, selected, onPress, dropdown }: { label?: string; value: string; selected?: boolean; onPress?: () => void; dropdown?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected ? { backgroundColor: t.primary, borderColor: t.primary } : { backgroundColor: dropdown ? t.card : 'transparent', borderColor: t.line3 },
      ]}
    >
      {label ? <Text style={{ color: t.text3, fontSize: 14 }}>{label}</Text> : null}
      <Text style={{ color: selected ? t.onPrimary : t.text, fontSize: 14 }}>{value}</Text>
      {dropdown ? <Icon name="chevronDown" size={14} color={t.text} strokeWidth={2} /> : null}
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.sectionLabel, { color: t.text2 }]}>{children}</Text>;
}

export function Title({ children, size = 28 }: { children: ReactNode; size?: number }) {
  const t = useTheme();
  return <Text style={{ fontFamily: fonts.serif, fontSize: size, lineHeight: size * 1.3, color: t.text }}>{children}</Text>;
}

export function PrimaryButton({ label, onPress, icon, busy, style }: { label: string; onPress: () => void; icon?: IconName; busy?: boolean; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={busy} style={[styles.primary, { backgroundColor: t.primary, opacity: busy ? 0.6 : 1 }, style]}>
      {busy ? <ActivityIndicator color={t.onPrimary} /> : icon ? <Icon name={icon} size={20} color={t.onPrimary} /> : null}
      <Text style={{ color: t.onPrimary, fontSize: 16, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: t.warnBg }]}>
      <Text style={{ color: t.warnText, fontSize: 14, flex: 1, lineHeight: 20 }}>{text}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={{ color: t.warnText, fontSize: 14, fontWeight: '600' }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 0.5 },
  searchInput: { flex: 1, fontSize: 16, height: 44 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 0.5 },
  sectionLabel: { fontSize: 13, fontWeight: '500', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 14 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginVertical: 8, padding: 12, borderRadius: 12 },
});
