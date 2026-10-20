// Hands a folder chosen in the folder picker back to the New chat screen underneath it.
import { create } from 'zustand';

type Picked = { path: string; name: string; nonce: number };

export const useFolderPick = create<{ picked?: Picked; pick: (path: string, name: string) => void }>((set) => ({
  picked: undefined,
  pick: (path, name) => set({ picked: { path, name, nonce: Date.now() } }),
}));
