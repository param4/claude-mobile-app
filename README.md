# claude-mobile-app

An iPhone and Android app (Expo / React Native) for using the **Claude desktop app's Code sessions on your Mac** from your phone, as if you were at your laptop. It looks and feels like Claude, in light and dark mode.

It needs **[claude-mobile-be](https://github.com/param4/claude-mobile-be)** running on your Mac. The phone talks only to your Mac, over your private [Tailscale](https://tailscale.com) network.

## What you can do

- **Projects:** every folder you've used in the desktop app's Code tab, plus "No folder", with search and pinned projects first.
- **Sessions:** the same filters as the desktop sidebar: status (active, archived, all), group by (date, state, none), sort (recent, created, name), search, and pinned chats on top. Badges show chats that are working or waiting for approval.
- **Chat:**
  - full history, formatted replies, and collapsible tool cards with their output
  - continue any chat with streamed replies, and stop a reply mid-turn
- **Session settings:** switch model, effort (low to max) and permission mode (Ask before edits, Accept edits, Plan, Auto, Bypass) at any time.
- **Slash commands:** type `/` for a searchable list of every command and skill on your Mac.
- **Approvals:** Allow once, Always allow, or Deny with a note for Claude. Claude's questions appear as option cards.
- **New chats:** start a chat in any project or in "No folder". It also shows up in the desktop app.

## Requirements

- A Mac running **claude-mobile-be** (see its README).
- **Tailscale** on the phone and the Mac, signed in to the same account.
- **Node.js 22+**, **pnpm 10**, and this repo cloned **next to** `claude-mobile-be`:

  ```
  claude-mobile/
    claude-mobile-be/    # server + shared protocol
    claude-mobile-app/   # this repo; imports ../claude-mobile-be/protocol
  ```
- **For testing with Expo Go:** the Expo Go app on the phone, and a free [Expo account](https://expo.dev) signed in on both the phone (Expo Go) and the Mac (`npx expo login --browser`).

## Getting started

1. Set up and start the server: follow [claude-mobile-be](https://github.com/param4/claude-mobile-be#getting-started) (`pnpm install`, `pnpm start`).
2. Install the app's dependencies:

   ```bash
   cd claude-mobile-app
   pnpm install
   cp .env.example .env.local
   ```

3. In `.env.local`, set `REACT_NATIVE_PACKAGER_HOSTNAME` to your Mac's Tailscale IP (shown in the Tailscale menu-bar app, or `tailscale ip -4`). The Expo QR code then points at Tailscale, so the phone can load the app from any network, not just home Wi-Fi.
4. Start the dev server:

   ```bash
   npx expo start
   ```

5. Scan the Expo QR code with the iPhone camera (or from Expo Go on Android). The app opens in Expo Go.
6. In the app, tap **Scan QR code** and scan the code that `pnpm pair` prints in `claude-mobile-be`. Done; you only pair once.

## Using the app

| Screen | How to get there | Notes |
|---|---|---|
| Pair | First launch, or tap the Mac name on Projects | Scan the QR code, or enter the address and token by hand |
| Projects | Home | **New chat** asks which project the chat is for |
| Sessions | Tap a project | Status, Group and Sort chips; the new-chat icon is top right |
| Chat | Tap a session | The model chip (top right) or mode chip (composer) opens settings; `/` opens commands |
| New chat | New chat, or the icon on Sessions | Starts with the settings of that project's latest chat |

**Good to know**

- Chats you continue from the phone appear in the desktop app after you **restart it**.
- Use one device at a time per chat.
- If the app says it can't reach your Mac, check that Tailscale is on, on both devices, that the Mac is awake, and that the server is running.

## Development

```bash
npx expo start            # dev server (Expo Go or a development build)
npx expo start --web      # browser preview (needs CM_DEV_CORS_ORIGIN on the server)
npx tsc --noEmit          # typecheck
pnpm doctor               # expo-doctor
```

**Structure**

```
src/
  app/                    screens (Expo Router)
    _layout.tsx           fonts, theme, React Query
    pair.tsx              pairing (QR or manual)
    index.tsx             Projects
    project/[key].tsx     Sessions with filters
    session/[id].tsx      Chat (history + live)
    new.tsx               New chat
  components/             Composer, SettingsSheet, PermissionCard, ChatItemView, OptionSheet, Icon, ui
  lib/
    api.ts                REST client
    live.ts               shared reconnecting WebSocket and per-chat live state (Zustand)
    connection.ts         pairing, stored in the keychain (localStorage on web)
    format.ts             time, model and path formatting
  theme.ts                light and dark tokens (Anthropic palette)
metro.config.js           lets Metro see ../claude-mobile-be/protocol
app.config.ts             reads APP_BUNDLE_ID from .env.local
```

**Notes**

- **Shared types:** `@claude-mobile/protocol` links to `../claude-mobile-be/protocol` (see `package.json`, `metro.config.js` and `tsconfig.json`). Change the protocol in the BE repo, then typecheck both repos.
- **Design:** Ivory `#FAF9F5`, Slate `#141413`, Clay `#D97757`, warm greys, Source Serif 4 for headings and the system font for UI. Keep colours in `theme.ts`.
- **Chat merging:** live items use the same ids as the transcript, so the chat screen merges history and live updates without duplicates.

## Installing on your phone without Expo Go

Not done yet (roadmap). The plan:

- **iPhone:**
  1. Build a development or release build (`npx expo run:ios --device` with Xcode, or `eas build`).
  2. Install the `.ipa` with Sideloadly and a free Apple ID; it must be re-signed every 7 days.
  3. Set `APP_BUNDLE_ID` to an id your Apple ID can sign.
- **Android:** build an APK (`eas build -p android --profile preview`, or `npx expo run:android`) and install it directly.

## Troubleshooting

| Problem | Fix |
|---|---|
| "You need to be signed in to Expo Go and Expo CLI" | Sign in with the same Expo account in Expo Go and with `npx expo login --browser` on the Mac, then restart `npx expo start` |
| "Can't reach <Mac>" | Tailscale on for both devices, Mac awake, server running (`pnpm start` in claude-mobile-be) |
| "This phone is no longer paired" | The server's token changed; run `pnpm pair` and scan again |
| Expo QR opens nothing away from home | Set `REACT_NATIVE_PACKAGER_HOSTNAME` in `.env.local` to the Mac's Tailscale IP and restart Expo |
| `Unable to resolve @claude-mobile/protocol` | Clone claude-mobile-be next to this repo and run `pnpm install` in both |

## Roadmap

- [x] Browse projects, sessions and history
- [x] Live chat, settings, slash commands, approvals, questions, new chats
- [ ] Voice dictation (the mic button is disabled for now)
- [ ] Standalone installs (sideloaded `.ipa`, Android APK), app icon
- [ ] Settings screen
