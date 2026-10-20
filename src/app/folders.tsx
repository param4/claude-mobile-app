import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Folder } from '@claude-mobile/protocol';
import { Icon } from '@/components/Icon';
import { Notice, PrimaryButton, SearchField, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useFolderPick } from '@/lib/folderPick';
import { shortenHome } from '@/lib/format';
import { fonts, useTheme } from '@/theme';

// Browse folders on the Mac (inside the home folder) and start a chat in one.
// mode "pick" returns the folder to the New chat screen underneath; otherwise it opens New chat.
export default function FoldersScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [path, setPath] = useState<string>();
  const [filter, setFilter] = useState('');

  const folders = useQuery({ queryKey: ['folders', path], queryFn: () => api.folders(path), placeholderData: (prev) => prev });
  const here = folders.data?.path;
  const needle = filter.trim().toLowerCase();
  const list = (folders.data?.folders ?? []).filter((f) => f.name.toLowerCase().includes(needle));
  const name = here ? here.slice(here.lastIndexOf('/') + 1) : '';

  const open = (p: string) => {
    setFilter('');
    setPath(p);
  };

  const choose = () => {
    if (!here) return;
    if (mode === 'pick') {
      useFolderPick.getState().pick(here, name);
      router.back();
    } else router.replace({ pathname: '/new', params: { project: here, name } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.cancel}>
          <Text style={{ fontSize: 16, color: t.text }}>Cancel</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 20, gap: 8, paddingBottom: 10 }}>
        <Title>Choose a folder</Title>
        <Text style={{ fontFamily: fonts.mono, fontSize: 13, color: t.text2 }} numberOfLines={1}>
          {here ? shortenHome(here) : ' '}
        </Text>
        <SearchField value={filter} onChangeText={setFilter} placeholder="Filter folders" />
      </View>

      {folders.isError ? <Notice text={(folders.error as Error).message} action="Retry" onAction={() => folders.refetch()} /> : null}

      <FlatList
        data={list}
        keyExtractor={(f) => f.path}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          folders.data?.parent ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Up one folder"
              onPress={() => open(folders.data!.parent!)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.hover }]}
            >
              <View style={[styles.icon, { backgroundColor: t.fill }]}>
                <Icon name="back" size={18} color={t.text2} />
              </View>
              <Text style={{ fontSize: 16, color: t.text2 }}>Up one folder</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          folders.isLoading ? (
            <ActivityIndicator color={t.text3} style={{ margin: 24 }} />
          ) : (
            <Text style={{ color: t.text3, textAlign: 'center', marginTop: 32 }}>{needle ? 'Nothing matches.' : 'No folders inside.'}</Text>
          )
        }
        renderItem={({ item }) => <FolderRow folder={item} onPress={() => open(item.path)} />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: t.line }]}>
        <Text style={{ fontSize: 13, color: t.text3 }} numberOfLines={2}>
          Claude will be able to read and edit files in <Text style={{ fontFamily: fonts.mono, color: t.text }}>{here ? shortenHome(here) : '…'}</Text>.
        </Text>
        <PrimaryButton label={mode === 'pick' ? 'Use this folder' : 'Trust and start a chat here'} onPress={choose} busy={!here} />
      </View>
    </View>
  );
}

function FolderRow({ folder, onPress }: { folder: Folder; onPress: () => void }) {
  const t = useTheme();
  const meta = [folder.git ? 'git' : undefined, folder.chats ? `${folder.chats} ${folder.chats === 1 ? 'chat' : 'chats'}` : undefined].filter(Boolean).join(' · ');
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.hover }]}>
      <View style={[styles.icon, { backgroundColor: t.fill }]}>
        <Icon name="folder" size={20} color={t.text2} strokeWidth={1.6} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: t.text }} numberOfLines={1}>
          {folder.name}
        </Text>
        {meta ? <Text style={{ fontSize: 13, color: t.text3 }}>{meta}</Text> : null}
      </View>
      <Icon name="chevronRight" size={14} color={t.text3} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', paddingHorizontal: 12 },
  cancel: { height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 8, paddingHorizontal: 20 },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10, borderTopWidth: 0.5 },
});
