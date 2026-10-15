import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SessionSummary } from '@claude-mobile/protocol';
import { effortLabel, modelLabel, relativeTime } from '@/lib/format';
import { useTheme } from '@/theme';

export function SessionRow({ session, showProject }: { session: SessionSummary; showProject?: boolean }) {
  const t = useTheme();
  const meta = [showProject ? session.projectName : undefined, modelLabel(session.model), effortLabel(session.effort)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.hover }]}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '500', color: t.text }} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={{ fontSize: 13, color: t.text3 }}>{relativeTime(session.lastActivityAt)}</Text>
        </View>
        {session.lastPrompt ? (
          <Text style={{ fontSize: 14, color: t.text2 }} numberOfLines={1}>
            {session.lastPrompt}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {meta ? <Text style={{ fontSize: 12, color: t.text3 }}>{meta}</Text> : null}
          {session.liveState === 'working' ? (
            <View style={[styles.live, { backgroundColor: t.clayTint }]}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.clay }} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: t.clayText }}>Working</Text>
            </View>
          ) : null}
          {session.liveState === 'needs-input' ? (
            <Text style={[styles.badge, { backgroundColor: t.warnBg, color: t.warnText }]}>Needs approval</Text>
          ) : null}
          {session.archived ? (
            <Text style={[styles.badge, { backgroundColor: t.fill, color: t.text2 }]}>Archived</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, paddingHorizontal: 20, minHeight: 44 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badge: { fontSize: 12, fontWeight: '500', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
});
