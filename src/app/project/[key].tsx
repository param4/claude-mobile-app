import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SessionQuery } from '@claude-mobile/protocol';
import { OptionSheet, type Option } from '@/components/OptionSheet';
import { SessionRow } from '@/components/SessionRow';
import { Chip, IconButton, Notice, SearchField, SectionLabel, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { shortenHome } from '@/lib/format';
import { fonts, useTheme } from '@/theme';

const statusOptions: Option<SessionQuery['status']>[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];
const groupOptions: Option<SessionQuery['groupBy']>[] = [
  { value: 'date', label: 'Date' },
  { value: 'state', label: 'State' },
  { value: 'none', label: 'None' },
];
const sortOptions: Option<SessionQuery['sort']>[] = [
  { value: 'recency', label: 'Recent' },
  { value: 'created', label: 'Created' },
  { value: 'alpha', label: 'Name' },
];

type Sheet = 'status' | 'group' | 'sort' | undefined;

const labelOf = <T extends string>(options: Option<T>[], v: T) => options.find((o) => o.value === v)?.label ?? v;

export default function SessionsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { key, name } = useLocalSearchParams<{ key: string; name?: string }>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SessionQuery['status']>('active');
  const [groupBy, setGroupBy] = useState<SessionQuery['groupBy']>('date');
  const [sort, setSort] = useState<SessionQuery['sort']>('recency');
  const [sheet, setSheet] = useState<Sheet>();

  const q = search.trim();
  const sessions = useQuery({
    queryKey: ['sessions', key, status, groupBy, sort, q],
    queryFn: () => api.sessions({ project: key, status, groupBy, sort, q: q || undefined }),
    placeholderData: (prev) => prev,
  });
  const groups = sessions.data?.groups ?? [];
  const cwd = groups[0]?.sessions[0]?.cwd;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton name="back" label="Back to projects" onPress={() => router.back()} />
        <IconButton
          name="newChat"
          label="New chat in this project"
          onPress={() => router.push({ pathname: '/new', params: { project: key, name: name ?? '' } })}
        />
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 2 }}>
        <Title>{name ?? 'Project'}</Title>
        {cwd && key !== 'no-folder' ? (
          <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: t.text3 }} numberOfLines={1}>
            {shortenHome(cwd)}
          </Text>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search chats" />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 6 }}>
          <Chip dropdown label="Status" value={labelOf(statusOptions, status)} onPress={() => setSheet('status')} />
          <Chip dropdown label="Group" value={labelOf(groupOptions, groupBy)} onPress={() => setSheet('group')} />
          <Chip dropdown label="Sort" value={labelOf(sortOptions, sort)} onPress={() => setSheet('sort')} />
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={sessions.isRefetching} onRefresh={() => sessions.refetch()} tintColor={t.text3} />}
        keyboardShouldPersistTaps="handled"
      >
        {sessions.isError ? <Notice text={(sessions.error as Error).message} action="Retry" onAction={() => sessions.refetch()} /> : null}
        {groups.map((g) => (
          <View key={g.key}>
            <SectionLabel>{g.label}</SectionLabel>
            {g.sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </View>
        ))}
        {sessions.isSuccess && !groups.length ? (
          <Text style={{ color: t.text3, textAlign: 'center', marginTop: 40 }}>No chats here.</Text>
        ) : null}
      </ScrollView>

      <OptionSheet title="Status" options={statusOptions} value={status} visible={sheet === 'status'} onSelect={setStatus} onClose={() => setSheet(undefined)} />
      <OptionSheet title="Group by" options={groupOptions} value={groupBy} visible={sheet === 'group'} onSelect={setGroupBy} onClose={() => setSheet(undefined)} />
      <OptionSheet title="Sort by" options={sortOptions} value={sort} visible={sheet === 'sort'} onSelect={setSort} onClose={() => setSheet(undefined)} />
    </View>
  );
}
