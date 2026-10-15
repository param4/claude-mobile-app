// The paired Mac (address + token), kept in the device keychain.
import { create } from 'zustand';
import { PairingPayload } from '@claude-mobile/protocol';
import { storage } from './storage';

const KEY = 'pairing';

type ConnectionState = {
  pairing?: PairingPayload;
  loaded: boolean;
  load: () => Promise<void>;
  save: (p: PairingPayload) => Promise<void>;
  clear: () => Promise<void>;
};

export const useConnection = create<ConnectionState>((set) => ({
  pairing: undefined,
  loaded: false,
  load: async () => {
    const raw = await storage.get(KEY);
    let pairing: PairingPayload | undefined;
    try {
      pairing = raw ? PairingPayload.parse(JSON.parse(raw)) : undefined;
    } catch {
      pairing = undefined;
    }
    set({ pairing, loaded: true });
  },
  save: async (pairing) => {
    await storage.set(KEY, JSON.stringify(pairing));
    set({ pairing });
  },
  clear: async () => {
    await storage.remove(KEY);
    set({ pairing: undefined });
  },
}));
