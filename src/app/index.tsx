import { useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Project, SessionSummary } from '@claude-mobile/protocol';
import { Icon } from '@/components/Icon';
import { OptionSheet } from '@/components/OptionSheet';
import { SessionRow } from '@/components/SessionRow';
import { Chip, IconButton, Notice, SearchField, SectionLabel, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useConnection } from '@/lib/connection';
import { relativeTime, shortenHome } from '@/lib/format';
import { useTheme } from '@/theme';

type Sort = 'recent' | 'name';
const CHOOSE_FOLDER = '__choose-folder';

export default function ProjectsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pairing = useConnection((s) => s.pairing);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [picking, setPicking] = useState(false);

  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects, enabled: !!pairing });
  const needle = search.trim();
  const chats = useQuery({
    queryKey: ['search', needle],
    queryFn: () => api.sessions({ q: needle, groupBy: 'none', status: 'all' }),
    enabled: !!pairing && needle.length > 1,
  });

  const [pinned, rest] = useMemo(() => {
    const list = (projects.data?.projects ?? []).filter((p) => p.name.toLowerCase().includes(needle.toLowerCase()));
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return [list.filter((p) => p.pinned), list.filter((p) => !p.pinned)];
  }, [projects.data, needle, sort]);

  if (!pairing) return <Redirect href="/pair" />;

  const allProjects = projects.data?.projects ?? [];
  const newChatOptions = [
    ...allProjects.map((p) => ({ value: p.key, label: p.name })),
    ...(allProjects.some((p) => p.key === 'no-folder') ? [] : [{ value: 'no-folder', label: 'No folder' }]),
    { value: CHOOSE_FOLDER, label: 'Choose another folder…' },
  ];

  const chatHits: SessionSummary[] = needle.length > 1 ? (chats.data?.groups.flatMap((g) => g.sessions) ?? []) : [];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Title>Projects</Title>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Connected to ${pairing.name}. Change Mac`}
            onPress={() => router.push('/pair')}
            style={[styles.machine, { backgroundColor: t.hover }]}
          >
            <View style={[styles.dot, { backgroundColor: projects.isError ? t.danger : t.ok }]} />
            <Text style={{ color: t.text, fontSize: 14 }} numberOfLines={1}>
              {pairing.name.replace(/\.local$/, '')}
            </Text>
          </Pressable>
          <IconButton name="sliders" label="Settings" />
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search projects and chats" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Chip value="Recent" selected={sort === 'recent'} onPress={() => setSort('recent')} />
        <Chip value="Name" selected={sort === 'name'} onPress={() => setSort('name')} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={<RefreshControl refreshing={projects.isRefetching} onRefresh={() => projects.refetch()} tintColor={t.text3} />}
        keyboardShouldPersistTaps="handled"
      >
        {projects.isError ? <Notice text={(projects.error as Error).message} action="Retry" onAction={() => projects.refetch()} /> : null}
        {pinned.length ? <SectionLabel>Pinned</SectionLabel> : null}
        {pinned.map((p) => (
          <ProjectRow key={p.key} project={p} />
        ))}
        {rest.length ? <SectionLabel>{pinned.length ? 'All projects' : 'Projects'}</SectionLabel> : null}
        {rest.map((p) => (
          <ProjectRow key={p.key} project={p} />
        ))}
        {chatHits.length ? <SectionLabel>Chats</SectionLabel> : null}
        {chatHits.map((s) => (
          <SessionRow key={s.id} session={s} showProject />
        ))}
        {projects.isSuccess && !pinned.length && !rest.length && !chatHits.length ? (
          <Text style={{ color: t.text3, textAlign: 'center', marginTop: 40 }}>{needle ? 'Nothing matches.' : 'No sessions on this Mac yet.'}</Text>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={() => setPicking(true)}
        style={[styles.fab, { backgroundColor: t.primary, bottom: insets.bottom + 20 }]}
      >
        <Icon name="plus" size={20} color={t.onPrimary} />
        <Text style={{ color: t.onPrimary, fontSize: 16, fontWeight: '500' }}>New chat</Text>
      </Pressable>

      <OptionSheet
        title="New chat in…"
        options={newChatOptions}
        value=""
        visible={picking}
        onSelect={(key) =>
          key === CHOOSE_FOLDER
            ? router.push('/folders')
            : router.push({ pathname: '/new', params: { project: key, name: newChatOptions.find((o) => o.value === key)?.label ?? '' } })
        }
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/project/[key]', params: { key: project.key, name: project.name } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.hover }]}
    >
      <View style={[styles.folder, { backgroundColor: t.fill }]}>
        <Icon name="folder" size={20} color={t.text2} strokeWidth={1.6} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: t.text }} numberOfLines={1}>
          {project.name}
        </Text>
        {project.path ? (
          <Text style={{ fontSize: 13, color: t.text3 }} numberOfLines={1}>
            {shortenHome(project.path)}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ fontSize: 13, color: t.text3 }}>{relativeTime(project.lastActivityAt)}</Text>
        <Text style={{ fontSize: 13, color: t.text3 }}>
          {project.sessionCount} {project.sessionCount === 1 ? 'chat' : 'chats'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 12, gap: 8 },
  machine: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 999, maxWidth: 180 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 20, minHeight: 44 },
  fab: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingLeft: 16, paddingRight: 20, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  folder: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
