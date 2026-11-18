# Solmar City — an open-world crime game

![gta6-01 badge](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/hayangjelema83/gta6-01/rank.svg)
![reward](https://make.fun/badge/gta6-01/hayangjelema83/gta6-01/reward.svg)

Built for the make.fun bounty **Make GTA 6** — [play the competition](https://make.fun/c/gta6-01).

Solmar City is a 2D top-down open-world crime game that runs entirely in
your browser from static files. No libraries, no network requests, no
downloads: all art is drawn procedurally on canvas and all sound is
synthesized live with WebAudio.

You are Nico Reyes, a wheelman new to Solmar City, a sun-soaked coastal
town of avenues, parks, a marina and a long sandy beach. Mara Voss, a fixer
working out of La Brisa diner, has four jobs for you — a delivery, a
getaway, a tail to lose, and one big pickup. Steal cars, outrun the Solmar
police, and earn your place in the city.

## How to play

Serve the `game/` folder with any static server and open `index.html`:

```sh
node serve.ts
# then open http://localhost:8080
```

Press **Enter** on the title screen to start. Your progress (cash and
mission) saves automatically to localStorage.

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D or arrow keys | Walk, or drive when in a car |
| Shift | Run on foot |
| Mouse | Aim the pistol |
| Click | Shoot |
| E | Enter a car / exit a car / pick up a mission item |
| Space | Brake while driving |
| P or Esc | Pause |
| M | Mute / unmute sound |
| Enter | Start / restart |

## Features

- **A coastal city to explore** — a road grid with named buildings, parks,
  a marina and a beach with animated waves, all under warm afternoon light.
- **Traffic and pedestrians** — cars loop the avenues and slow for each
  other; pedestrians stroll the sidewalks and flee when shots ring out.
- **Cars to steal and drive** — walk up to any parked or traffic car, press
  E, and drive with acceleration, steering, braking and building collisions.
- **A wanted system** — stealing cars, hitting pedestrians and shooting
  raise 1–5 stars. Police cruisers spawn, chase and ram you. Stay out of
  sight and the heat dies down; get caught on foot at 3+ stars and you are
  busted.
- **Missions and a story** — four jobs for Mara Voss with map markers,
  objectives on the HUD and cash rewards, ending in the big pickup.
- **Combat on foot** — a pistol with mouse aim, ammo, health, and ammo /
  health / cash pickups scattered around the city.
- **A full HUD** — a live minimap showing the player, cars, police and the
  mission marker, wanted stars, cash, health, speed and the current
  objective.
- **Menus and saving** — a title screen with the story intro, pause,
  game over with restart, and automatic localStorage saves.
- **Synthesized sound** — engine hum, police sirens, gunshots, crashes and
  a lazy bass line, all generated with WebAudio.
- **Screenshot mode** — `?shot=<name>&seed=<n>` sets up a fixed scene:
  `start`, `drive`, `chase` or `mission`, the same every time for a given
  seed.

## Project layout

```
game/
  index.html        the page: canvas + module entry
  src/
    config.js       constants, palette, seeded RNG, math helpers
    world.js        city generation: roads, buildings, parks, beach
    player.js       the player on foot: walking, aiming, health
    vehicles.js     cars: creation, driving physics, collisions
    traffic.js      traffic cars and pedestrians
    police.js       the wanted system and police AI
    missions.js     the four-job story and its rewards
    combat.js       the pistol, bullets and what they hit
    render.js       the camera and everything drawn on it
    hud.js          HUD, minimap and the menu screens
    audio.js        WebAudio sound synthesis
    input.js        keyboard and mouse state
    shots.js        deterministic ?shot= scenes
    main.js         the game loop that conducts every system
```

## License

MIT — see `LICENSE`.
