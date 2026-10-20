// Picking, shrinking and uploading attachments for the composer.
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { Upload } from '@claude-mobile/protocol';
import { api } from './api';

export type Attachment = {
  key: string;
  kind: 'image' | 'file';
  uri: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  upload?: Upload;
};

type Local = { uri: string; name: string; mediaType: string; kind: 'image' | 'file'; width?: number; height?: number };

export const MAX_ATTACHMENTS = 10;
// Claude downsizes anything bigger, so there's no point sending more over the phone's connection.
const MAX_EDGE = 1568;

async function shrink(img: Local): Promise<Local> {
  if (Platform.OS === 'web') return img;
  const ctx = ImageManipulator.manipulate(img.uri);
  const w = img.width ?? 0;
  const h = img.height ?? 0;
  if (w > MAX_EDGE || h > MAX_EDGE) ctx.resize(w >= h ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { ...img, uri: saved.uri, mediaType: 'image/jpeg', name: img.name.replace(/\.\w+$/, '') + '.jpg' };
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function pickPhotos(limit: number): Promise<Local[]> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: limit, quality: 1 });
  if (res.canceled) return [];
  return res.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName ?? `photo-${i + 1}.jpg`,
    mediaType: a.mimeType ?? 'image/jpeg',
    kind: 'image',
    width: a.width,
    height: a.height,
  }));
}

export async function takePhoto(): Promise<Local[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera access is off for this app');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (res.canceled) return [];
  const a = res.assets[0]!;
  return [{ uri: a.uri, name: a.fileName ?? 'photo.jpg', mediaType: a.mimeType ?? 'image/jpeg', kind: 'image', width: a.width, height: a.height }];
}

export async function pickFiles(): Promise<Local[]> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return [];
  return res.assets.map((a) => {
    const mediaType = a.mimeType ?? 'application/octet-stream';
    return { uri: a.uri, name: a.name, mediaType, kind: /^image\/(jpeg|png|gif|webp)$/.test(mediaType) ? 'image' : 'file' };
  });
}

export async function pasteImage(): Promise<Local[]> {
  const img = await Clipboard.getImageAsync({ format: 'jpeg', jpegQuality: 0.85 });
  if (!img) throw new Error('No image on the clipboard');
  const b64 = img.data.slice(img.data.indexOf(',') + 1);
  const name = `pasted-${Date.now()}.jpg`;
  if (Platform.OS === 'web') return [{ uri: img.data, name, mediaType: 'image/jpeg', kind: 'image' }];
  const file = new File(Paths.cache, name);
  file.write(fromBase64(b64));
  return [{ uri: file.uri, name, mediaType: 'image/jpeg', kind: 'image', width: img.size.width, height: img.size.height }];
}

// The composer's attachment list: each one uploads as soon as it is added.
export function useAttachments() {
  const [items, setItems] = useState<Attachment[]>([]);
  const counter = useRef(0);

  const update = (key: string, change: Partial<Attachment>) => setItems((list) => list.map((a) => (a.key === key ? { ...a, ...change } : a)));

  const add = useCallback(async (pick: () => Promise<Local[]>) => {
    const picked = await pick();
    for (const raw of picked) {
      const key = `a${counter.current++}`;
      setItems((list) => [...list, { key, kind: raw.kind, uri: raw.uri, name: raw.name, status: 'uploading' }]);
      (async () => {
        try {
          const local = raw.kind === 'image' ? await shrink(raw) : raw;
          update(key, { uri: local.uri, upload: await api.upload(local.uri, local.name, local.mediaType), status: 'done' });
        } catch (e) {
          update(key, { status: 'error', error: e instanceof Error ? e.message : String(e) });
        }
      })();
    }
  }, []);

  return {
    items,
    add,
    remove: (key: string) => setItems((list) => list.filter((a) => a.key !== key)),
    clear: () => setItems([]),
    busy: items.some((a) => a.status === 'uploading'),
    ids: items.flatMap((a) => (a.status === 'done' && a.upload ? [a.upload.id] : [])),
  };
}
