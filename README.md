# Shredded Szn

Personal cut tracker — 78.7 kg → 75.7 kg by end of July 2026.
Mobile-first React app styled with GitHub dark (Primer) colours — #0D1117
canvas, bordered #161B22 cards, #58A6FF accent (system SF Pro for UI,
Source Serif 4 for display numbers). All data in `localStorage`.

## Run it

```bash
npm install
npm run dev      # dev server
npm run build    # production build to dist/
```

## Features

- **Today** — dashboard: calories-left hero with progress bar, protein/carbs/
  fat mini cards colour-coded green/amber/red against 2,150 kcal / 190 P /
  195 C / 68 F, workout chip select (Run shows a free-text run type), manual
  steps vs 10,000 goal, and a supplement checklist that resets daily
  (creatine 5 g + magnesium glycinate pre-loaded, custom ones addable).
- **Log** — quick-add meal presets, granular food logger using canonical
  macro values (raw meat weights, cooked rice weight), and custom food entry.
  Fruits (apple, banana, grapes, avocado) log as an untracked calorie buffer —
  shown but excluded from totals, except the pre-workout banana which is part
  of the tracked 231 kcal preset.
- **Weight** — weigh-in log and glide-path chart: actual weight (solid blue)
  vs the linear target path to 75.7 kg (dashed), with current weight,
  deviation from path, and days remaining.
- **Week** — calendar of any week (navigate back/forward) showing workout
  tags, run notes, tracked kcal, and colour-coded steps per day; tap a day to
  open it in the Today tab for backfilling.

## Data

Everything persists to `localStorage` under the key `cutlog-v1`. Canonical
food values and targets live in `src/db.js` — edit there if a product or
target changes.
