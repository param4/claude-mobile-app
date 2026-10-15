# claude-mobile-app: notes for Claude Code

The Expo (iOS + Android) app of Claude Mobile. The server is the sibling repo `../claude-mobile-be`, which also owns the shared `protocol/` package this app links to. Read [README.md](README.md) first; [AGENTS.md](AGENTS.md) has Expo's own guidance (always check the Expo SDK 57 docs, and use `npx expo install`).

## Decisions (agreed with the owner, don't re-litigate)
- **Look:** Claude-like, following Anthropic's brand: Ivory/Slate/Clay, warm greys, Source Serif 4 headings, system sans UI. Light and dark follow the phone. All colours live in `src/theme.ts`.
- **Stack:** Expo SDK 57 + Expo Router, Zustand (live state), TanStack Query (REST), `react-native-marked` (chosen over the unmaintained `react-native-markdown-display`), `react-native-svg`, `expo-camera` (QR), `expo-secure-store`.
- **Connection:** paired once via QR (`{ v, url, token, name }`). One shared reconnecting WebSocket with an outbox (`src/lib/live.ts`).
- **Install path:** Expo Go for now; later a development build, then an `.ipa` sideloaded with a free Apple ID (re-signed every 7 days) and an Android APK. `APP_BUNDLE_ID` comes from `.env.local`.
- **Voice (next):** mic in the composer → server proxy to Claude's speech-to-text, with phone speech recognition as fallback. This needs a development build, because Expo Go can't load the audio modules. Text-to-speech is out of scope.

## State
- **Done:**
  - Pair, Projects (search, pinned, New chat picker)
  - Sessions (status/group/sort chips, search, live badges)
  - Chat: history and live merged by id, streaming draft, Stop, settings sheet with model/effort/mode, slash palette, approval and question cards
  - New chat screen
- **Next:**
  - voice (phase 3)
  - polish, app icon, standalone builds (phase 4)
  - a working Settings button on Projects

## Gotchas
- `REACT_NATIVE_PACKAGER_HOSTNAME` must be in `.env.local`; Expo refuses it in `.env`.
- The protocol is linked from `../claude-mobile-be/protocol`. `metro.config.js` adds it to `watchFolders`, and `tsconfig.json` maps `zod` to this app's copy.
- Web preview: `npx expo start --web` against a server started with `CM_DEV_CORS_ORIGIN`. Storage falls back to `storage.web.ts` (localStorage), and the WebSocket passes `?token=`.
- Commit only when asked. No personal data in committed files: the repo is public.
