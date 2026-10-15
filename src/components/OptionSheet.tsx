import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { fonts, useTheme } from '@/theme';

export type Option<T extends string> = { value: T; label: string };

export function OptionSheet<T extends string>({
  title,
  options,
  value,
  visible,
  onSelect,
  onClose,
}: {
  title: string;
  options: Option<T>[];
  value: T;
  visible: boolean;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: t.card, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.line3 }]} />
        <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: t.text, marginBottom: 8 }}>{title}</Text>
        <View style={[styles.list, { borderColor: t.line2 }]}>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
                style={[styles.row, { borderBottomColor: t.line, backgroundColor: on ? t.hover : 'transparent' }]}
              >
                <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{o.label}</Text>
                {on ? <Icon name="check" size={20} color={t.text} strokeWidth={2} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 8 },
  list: { borderWidth: 0.5, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 14, borderBottomWidth: 0.5 },
});
