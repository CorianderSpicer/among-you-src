# AMONG YOU

A browser-based, strictly 2D top-down multiplayer social-deduction game for 4–15 players. It uses original "Glim" astronauts and five original maps, has 32 special roles and 25 task minigames, and runs real peer-to-peer online play.

**Stack:** React, TypeScript, Vite, Phaser 3, PeerJS, Zustand, Framer Motion and Tailwind CSS. All art and sound are generated in code; there are no third-party asset files.

## Run it
```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # static site in dist/
npm test           # 22 simulation tests, including AI matches on every map
```
- **Host anywhere static:** `dist/` is a plain static site (relative paths), so you can upload it to any static web host.
- **GitHub Pages:** push the project to a repository and enable Pages with the source set to "GitHub Actions". The included `.github/workflows/pages.yml` then builds and deploys the site.

## Playing
- **Play:** an instant practice match against AI crew.
- **Create Room:** host an online room and share the 5-character code.
- **Find Game:** join a room by its code.
- **Lobby:**
  - Walk around the Departure Lounge.
  - Use the *Customize* and *Game Settings* consoles.
  - The host picks the map and can add AI crew to fill seats.
  - The host controls infiltrator, neutral and special-role counts, per-role spawn chances, cooldowns, durations, vision, tasks, meeting and voting timers, anonymous votes, eject confirmation and role reveal.

### Controls
| Input | Controls |
|---|---|
| Keyboard | WASD or arrows to move, Shift to run, E or Space to use, R to report, Q to eliminate, F for your ability, V to vent, G for sabotage, Tab for the map, Enter for chat (lobby and ghosts), Esc for the menu |
| Mouse | Wheel to zoom |
| Gamepad | Stick to move; A use, B report, X ability, Y eliminate |
| Touch | On-screen joystick and buttons |

All keys can be rebound in Settings.

## Content
- **Maps:** each has its own layout, art and mechanics.

  | Map | Unique mechanics |
  |---|---|
  | Orbital Nexus | Gravity fluctuation, reactor pulses, door lockdown, gravity sabotage |
  | Frostfall Research | Blizzards, slippery ice tunnels, cold snow fields, flash freeze, heating (life-support) failure |
  | Abyssal Station | Water leaks to seal, a flooded corridor, flooding and pressure sabotage, bulkheads |
  | The Lost Colony | Sandstorms, hidden underground passages, unstable power, outdoor plaza |
  | Helios Dreadnought | Keycard-restricted rooms, an automated turret defense grid, security lockdown, heavy camera coverage |

- **Roles:** 32 special roles (15 crew, 12 infiltrator, 5 neutral) plus the base Crewmate and Infiltrator. Every role lists its ability, cooldown, duration, limits, counterplay and win condition in-game (tap your role chip).
- **Minigames:** 25 task minigames (every one a different interaction), plus 5 sabotage-repair games.
- **Sabotage:** 10 types, each with a real repair mechanic.
  - Reactor needs two players holding at once.
  - Oxygen needs a keypad code.
  - Comms needs frequency matching.
  - Security needs a reboot sequence.
  - Doors are locked per room.
  - Gravity needs magnet alignment.
  - Life support needs thermostats.
  - Power needs switches.
  - Flooding needs pump valves.
  - Pressure needs chamber balancing.
- **Systems:**
  - Meetings with chat, timers and animated vote reveal, followed by an ejection sequence.
  - Ghosts can free-roam, spectate living players, do tasks and use a ghost-only chat.
  - The host has security cameras, an admin map and access logs.
  - End screen with role reveal, per-player stats and MVP awards.
  - Replay viewer with a timeline and downloadable replay JSON.
  - AI crew that do tasks, fix sabotage, report bodies, argue and vote.
- **Cosmetics:**
  - 18 colours
  - 8 helmets
  - 16 hats
  - 10 outfits
  - 8 backpacks
  - 8 pets
  - 8 trails
  - 8 accessories
  - 4 victory animations

  Every cosmetic is rendered live.

## Multiplayer
The host's browser runs the authoritative 30 Hz simulation.
- **What the host validates:** every elimination (range, line of sight, cooldown, faction, shields), vote, task (must be opened at the panel and take at least a minimum duration), sabotage, ability and movement (speed and wall checks).
- **What each player receives:** only their own filtered view. Other players appear only when they are in sight. Roles are sent privately, and infiltrators also learn their teammates.
- **Duplicate actions:** these are dropped by sequence number.
- **Disconnects:**
  - Dropped guests auto-reconnect to the same seat and role for 60 seconds.
  - Silent peers are detected within about 7 seconds.
  - If the host leaves, everyone returns to the menu.

**Signalling:**
- By default the game uses the PeerJS public cloud.
- A self-hosted PeerJS server (`npx peerjs --port 9000 --path /ay --allow_discovery`) can be set in Settings → Network or with `?signal=http://host:9000/ay`. With discovery enabled, it also lists public rooms in Find Game.
- Strict networks may need a TURN relay. You can add one in Settings.

**Tests (`tools/e2e.mjs`):** 31 checks with three real Chromium browsers connected over WebRTC through a local PeerJS server, covering:
- room codes and joining;
- invalid codes;
- lobby and in-match position sync;
- private roles;
- rejected illegal kills and tasks;
- meeting and vote sync;
- duplicate filtering;
- reconnection;
- host departure.

## Limitations
- **No host migration:** if the host closes the tab, the room ends.
- **No voice chat:** text chat only, and AI crew use canned lines.
- **Replays:** these record positions four times a second plus key events, not every visual effect.
- **Performance:**
  - Tested in headless Chromium with software rendering. Real phones and tablets are untested.
  - The *Low* quality setting caps the frame rate at 30 and lowers the resolution for weak devices.
- **AI balance:** in AI-only matches the crew wins about 65% of the time. Matches with real players will play out differently.
- **Name:** "Among You" is fine for a personal project, but it is close to an existing game's trademark, so rename it before any public release.
