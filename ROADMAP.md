# Warung Kita — Roadmap

Warung Kita is an early playable prototype. One restaurant with one recipe is complete and playable from opening to a fully staffed warung: tables, two cooks, a cleaner and a cashier, upgrades, bulk orders and a physical economy. The milestone history (in Spanish) is in [docs/ROADMAP.md](docs/ROADMAP.md).

The project is paused because the first restaurant is now "complete" and there is no long-term direction after it yet. The work below picks it up again. First it makes what exists reliable (tests, CI, QA on real devices). Then it adds content. Finally it answers the main open question: **how does the game scale beyond one warung?**

Estimates are rough and in hours of focused work, including tests and documentation updates.

## 1. Tests and infrastructure (~10 h)

| Task | Estimate |
| --- | --- |
| GitHub Actions CI: `npm ci`, `npm test`, `npm run typecheck`, `npm run build` on every push and pull request | 1.5 h |
| Turn the ad-hoc browser QA scripts (currently local, untracked and tied to one Windows machine) into a small, reproducible end-to-end smoke test: opening flow, first sale, save/reload | 5 h |
| More rule tests: save validation against corrupted or partial data, v1→v2 migration edge cases, economy debt and tray rounding, progression gates (office → tables → staff → order board) | 3.5 h |

## 2. Bugs, QA and balance (~16 h)

| Task | Estimate |
| --- | --- |
| Manual review of the "normal progression" milestone (the one still pending) and fixes for what it finds | 4 h |
| Test on physical Android and iOS phones (touch drag, safe areas, panel scrolling, orientation changes) and fix issues. So far mobile has only been checked in emulation | 3 h |
| Cross-browser pass on Firefox and Safari, with fixes | 2 h |
| Low-FPS behaviour: the active delta is capped at 100 ms, so below 10 FPS the simulation slows down. Evaluate a fixed-step accumulator without breaking the "active time only" rule | 2.5 h |
| Reduce the Phaser bundle-size warning (chunk splitting or a lazy-loaded scene) | 1 h |
| Balance playtest with 2–3 outside players: time to first upgrade, debt recovery, and the demand curve between tiers. Adjust values in `src/config.ts` | 3.5 h |

## 3. New gameplay features (~22 h)

These are the ideas already recorded in the design notes, ordered by expected value.

| Task | Estimate |
| --- | --- |
| **Second recipe** (for example mie goreng): ingredient and stock, cooking rules, a per-customer dish choice, staff batching per recipe, i18n and tests | 8 h |
| **Rush hours:** time-boxed demand spikes with a visual warning, built on top of the existing tier system without "burst debt" | 5 h |
| **Additional fridge or storage station:** a second ingredient source to cut walking time and give cooks a routing choice | 3 h |
| **Basic layout editing:** move purchased tables between free slots, with the same safe-placement checks used when buying | 6 h |

## 4. Game direction: scaling beyond one warung (~19 h)

This is the part I most want to work on. The current loop ends once the first restaurant is full. Possible directions are:

- **A second location:** a new warung with a different layout and a local specialty dish. You travel between locations, and they share one wallet.
- **Managers and a franchise:** hire a manager who keeps a finished location running while you build the next one (still counting active time only, at reduced efficiency). Franchise upgrades then improve all locations.
- **Days and goals:** split play into shifts with daily targets, so there is a reason to optimise a restaurant you have already finished.

| Task | Estimate |
| --- | --- |
| Design spike: write up the three directions above (core loop, what carries over, risks), playtest paper prototypes, and pick one | 3 h |
| Second-location prototype: a second layout, travel between locations, a shared wallet, and save format v3 with migration | 10 h |
| Manager/franchise prototype: one manager role that runs a finished location automatically, plus one franchise-wide upgrade | 6 h |

## Summary

| Area | Hours |
| --- | --- |
| Tests and infrastructure | 10 |
| Bugs, QA and balance | 16 |
| New gameplay features | 22 |
| Game direction | 19 |
| **Total** | **~67 h** |

Out of scope for now: final art, audio, a backend or online features, monetisation, and AI features inside the game.
