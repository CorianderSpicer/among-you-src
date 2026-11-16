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

## Optimization & multitouch pass

### Multitouch — what was wrong and what fixed it

The joystick wrote its knob position into **React state on every `pointermove`**. An iPad samples
touch at up to 120 Hz, so dragging the stick re-rendered a React subtree ~120 times a second while
the game loop was already struggling. Input events were arriving; the page was too busy to act on
them, which feels exactly like "the button didn't register".

The input layer now follows the Pointer Events model properly:

- The joystick claims **one `pointerId`** and ignores every other pointer. A second finger on KILL,
  REPORT, USE, an ability or sabotage is not its pointer, so it reaches that button untouched.
- The knob is moved by writing a `transform` **straight to the DOM node** — no React state, no
  re-render per move.
- `setPointerCapture` keeps the stick tracking if the thumb slides off the pad, and because capture
  is per-pointer it never swallows anyone else's touch. `pointercancel` and `lostpointercapture`
  both release the stick, so a browser gesture or app switch can't leave you walking into a wall.
- Releasing the stick never cancels a button; releasing a button never cancels the stick.
- Action buttons fire on **`pointerdown`**, not `click`. Browsers only synthesise `click` for the
  *primary* pointer, so anything on `onClick` was dead while another finger was already down.
- Phaser's `activePointers` raised from 1 to 5 so the canvas itself tracks concurrent touches.

### Performance

Measured in a software-rendered test environment (absolute numbers are not iPad numbers; the
*relative* change is what transfers):

| Render scale | FPS | avg frame | p95 frame |
|---|---|---|---|
| DPR 2.0 — the old default on iPad | 1.5 | 664 ms | 767 ms |
| DPR 0.9 — adaptive floor | 3.3 | 301 ms | 417 ms |

- **Adaptive resolution.** The game now watches real frame times and sheds render resolution when
  the device can't keep up, easing back when it can. The quality ceiling on touch devices is capped
  at DPR 1.5 instead of 2 — an iPad on "high" was being asked for roughly 4 million pixels a frame.
- **Darkness mask.** The vision cone rebuilt a canvas *and re-uploaded it to the GPU every frame*,
  including while standing perfectly still. It now rebuilds only when something that affects it
  actually moves. Standing still: **60 uploads/sec → 0** (measured).
- **HUD re-renders.** Two components subscribed to the entire game store, so any field changing
  (network round-trip time ticks several times a second) re-rendered the whole HUD. Now subscribed
  per field.
- **MSAA** disabled on touch devices, where it costs real fill rate and buys little.

### Map redesign

All five original maps were rooms joined by **3-tile corridors**. Walkways are now 7–8 tiles and the
rooms have grown to sit against them, with loop routes so no single doorway owns a wing.

| Map | Change |
|---|---|
| Orbital Nexus | New **Central Concourse** running through the middle, plus an Observation Deck; 10 → 12 rooms |
| Frostfall Research | Snow field and ice tunnels opened into crossable galleries; added Mess Hall and Drill Head |
| Abyssal Station | Flooded corridor became a broad **Flooded Gallery**; added Moon Pool and Hatchery |
| The Lost Colony | Plaza enlarged into a real square with open streets; added Market Row and Salvage Yard |
| Helios Dreadnought | Open **Spinal Gantry** down the middle, cavernous hangar, Muster Deck aft |

Keycard rooms on Helios stay deliberately tight — the restriction is the point of them.

### Testing

28 unit/integration tests pass, including map connectivity and full AI matches played to a winner on
**all seven maps**. In-browser: 7/7 gameplay regression checks (menu, lobby, match start, movement,
kill, report→meeting, voting) and 4/4 multitouch checks, with zero console errors.

**Limitations.** Performance was measured under software rendering, not on real hardware — the
adaptive scaler is designed to self-tune on whatever device it lands on, but the actual iPad frame
rate is unverified. Three- and four-finger combinations were tested via synthetic touch events, not
on a physical screen.
