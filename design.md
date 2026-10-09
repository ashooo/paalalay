# PAALALAY — Variant A: Linaw

> Self-contained, framework-neutral design spec. Units: **dp** for sizes, **sp** for type. Values are numbers for React Native `StyleSheet`.

## 1. Brand overview
- **Name:** PAALALAY = **Paalala** (reminder) + **Alalay** (assistance, a steadying hand). The two words overlap on **ALALA**: PA + ALALA + Y.
- **Concept:** Clear, cool and quietly dependable — clarity (linaw) you can trust.
- **Rationale:** A trust-first, clinical-modern look. Cool teal signals calm and care without hospital coldness; soft rounded shapes and generous whitespace lower anxiety for daily health tracking.
- **Personality:** calm, precise, reassuring, modern.
- **Voice/tone:** friendly, simple English with light Filipino touches ("Paalala", "Kumusta"). Calm, never alarming, never clinical-cold, never gamified.

**Do**
- Use neutral wording: "Latest reading", "7-day average", "Taken", "Skipped".
- Always confirm before saving anything the assistant proposes.
- Show "Works offline • Data stays on this device" on Home and in Settings.
- Keep lock-screen notifications generic: "PAALALAY: time for your reminder".

**Don't**
- Don't diagnose or label readings ("dangerous", "high BP", "you have…").
- Don't give dosage advice or use red/green to mean bad/good readings.
- Don't use flag colours, stereotypes, streaks, badges or confetti.
- Don't show medicine names or health values on the lock screen.

**Tagline options**
1. Your gentle reminder, always here.
2. Paalala at alalay, sa iyong kamay.
3. Clear care, kept on your phone.

## 2. Logo & app icon
- **Wordmark:** PAALALAY set in Manrope ExtraBold, all caps, +4% tracking. The shared letters ALALA sit on a soft rounded teal underline bar, showing where Paalala and Alalay overlap.
- **Symbol:** Two overlapping rounded arcs: the left forms a bell (reminder), the right a cupped hand (support). Where they overlap, a small dot — the shared 'ALALA'.
- **Clear space:** at least the cap-height of the "P" on all sides (≈ 0.5× symbol width for the symbol alone).
- **Minimum size:** wordmark 96 dp wide; symbol 24 dp (use the symbol alone below 96 dp).
- **Light/dark:** use the light-token SVG on `background`/`surface` light; dark-token SVG on dark. Single-colour fallback: `text` on any background.
- **Android adaptive icon:** 108×108 dp canvas. Foreground = symbol only, kept inside the central **66 dp safe zone** (the SVG below already sits within it). Background layer = flat `light.surfaceVariant` (#E3EFF1). Monochrome layer (Android 13 themed icons) = symbol in a single colour. Expo: `android.adaptiveIcon.foregroundImage` (1024 px PNG export) + `backgroundColor: "#E3EFF1"`.

**Symbol SVG (light)**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108"><path d="M30 66V48a18 18 0 0 1 36 0v18" fill="none" stroke="#0B6E79" stroke-width="7" stroke-linecap="round"/><path d="M44 58c0 14 10 22 22 22s20-8 20-22" fill="none" stroke="#1E8C88" stroke-width="7" stroke-linecap="round"/><circle cx="54" cy="66" r="5.5" fill="#3A5A8C"/><path d="M24 70h18" stroke="#0B6E79" stroke-width="7" stroke-linecap="round"/></svg>
```
**Symbol SVG (dark)**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108"><path d="M30 66V48a18 18 0 0 1 36 0v18" fill="none" stroke="#5FD0D6" stroke-width="7" stroke-linecap="round"/><path d="M44 58c0 14 10 22 22 22s20-8 20-22" fill="none" stroke="#7EDCD3" stroke-width="7" stroke-linecap="round"/><circle cx="54" cy="66" r="5.5" fill="#A9C3F0"/><path d="M24 70h18" stroke="#5FD0D6" stroke-width="7" stroke-linecap="round"/></svg>
```
**Wordmark SVG (light)** — convert text to outlines before shipping, or render with react-native-svg after fonts load.
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="56" viewBox="0 0 240 56"><rect x="40" y="40" width="128" height="6" rx="3" fill="#1E8C88"/><text x="0" y="34" font-family="Manrope" font-weight="800" font-size="30" letter-spacing="1.2" fill="#10272C">PA<tspan fill="#0B6E79">ALALA</tspan>Y</text></svg>
```

## 3. Color tokens (hex)
| Token | Light | Dark |
|---|---|---|
| background | #F4F8F9 | #0B181B |
| surface | #FFFFFF | #132428 |
| surfaceVariant | #E3EFF1 | #1B3236 |
| primary | #0B6E79 | #5FD0D6 |
| onPrimary | #FFFFFF | #00363B |
| secondary | #3A5A8C | #A9C3F0 |
| accent | #1E8C88 | #7EDCD3 |
| text | #10272C | #E6F2F3 |
| textMuted | #4C6368 | #9DB5B9 |
| border | #C6D7DA | #2E474B |
| success | #1F7A4D | #6FD39A |
| warning | #8A5A00 | #F2C063 |
| error | #B3261E | #FFB4AB |
| info | #1E5FA8 | #9CC7FF |
| chart_blood_pressure | #0072B2 | #56B4E9 |
| chart_blood_sugar | #B36B00 | #F0B840 |
| chart_temperature | #C2410C | #F08A4B |
| chart_weight | #007A5A | #3CC79A |
| chart_symptom | #A64D86 | #E3A0C8 |
| status_taken | #1F7A4D | #6FD39A |
| status_skipped | #5E7074 | #9DB5B9 |
| status_missed | #8A5A00 | #F2C063 |

Notes: `success/warning/error/info` are for **app states** (saved, unsaved changes, failed save, tip), never to judge a reading. Chart colours are based on the Okabe–Ito colour-blind-safe palette. Medication status: taken = `status_taken` + check icon; skipped = `status_skipped` + "Skipped" label; missed = `status_missed` + "Missed" label (always with text, never colour alone).

**Contrast ratios (WCAG 2.1)**
| Pairing | Light | Dark | Target |
|---|---|---|---|
| text on background | 14.56:1 | 15.82:1 | ≥ 4.5:1 |
| text on surface | 15.57:1 | 14.01:1 | ≥ 4.5:1 |
| textMuted on surface | 6.38:1 | 7.43:1 | ≥ 4.5:1 |
| textMuted on surfaceVariant | 5.43:1 | 6.26:1 | ≥ 4.5:1 |
| onPrimary on primary | 5.96:1 | 7.22:1 | ≥ 4.5:1 |
| primary on surface (text/UI) | 5.96:1 | 8.76:1 | ≥ 4.5:1 |
| secondary on surface | 6.95:1 | 8.97:1 | ≥ 4.5:1 |
| success on surface | 5.32:1 | 8.74:1 | ≥ 4.5:1 |
| warning on surface | 5.93:1 | 9.53:1 | ≥ 4.5:1 |
| error on surface | 6.54:1 | 9.44:1 | ≥ 4.5:1 |
| info on surface | 6.45:1 | 9.18:1 | ≥ 4.5:1 |
| accent on surface (UI) | 4.07:1 | 9.97:1 | ≥ 3.0:1 |
| chart_blood_pressure on surface (UI) | 5.19:1 | 6.94:1 | ≥ 3.0:1 |
| chart_blood_sugar on surface (UI) | 4.18:1 | 8.88:1 | ≥ 3.0:1 |
| chart_temperature on surface (UI) | 5.18:1 | 6.44:1 | ≥ 3.0:1 |
| chart_weight on surface (UI) | 5.34:1 | 7.5:1 | ≥ 3.0:1 |
| chart_symptom on surface (UI) | 5.21:1 | 7.73:1 | ≥ 3.0:1 |

## 4. Typography
- **Heading:** Manrope — **Body:** Manrope — **Numbers/readings:** Manrope. All are free Google Fonts with full Latin Extended support (ñ, Ñ, é).
- **Expo packages:** `@expo-google-fonts/manrope` (load with `useFonts`, keep splash until loaded).
- Use `fontVariant: ["tabular-nums"]` for readings. Respect system font scaling (do not set `allowFontScaling={false}`).

| Style | Family | Size (sp) | Line height | Weight |
|---|---|---|---|---|
| display | Manrope | 32 | 38 | 700 |
| title | Manrope | 24 | 32 | 700 |
| subtitle | Manrope | 18 | 26 | 600 |
| body | Manrope | 16 | 24 | 400 |
| label | Manrope | 16 | 20 | 600 |
| caption | Manrope | 14 | 20 | 400 |
| reading | Manrope | 40 | 48 | 700 |

## 5. Spacing, radius, elevation, sizing
- **Spacing:** xxs 4 / xs 8 / sm 12 / md 16 / lg 24 / xl 32 / xxl 48
- **Radius:** sm 8 / md 14 / lg 20 / xl 28 / pill 999
- **Elevation (Android `elevation`):** level0 0 / level1 1 / level2 3 / level3 6
- **Border width:** 1
- **Touch targets:** min 48×48 dp; primary buttons 48 dp tall; tab bar items 64×56 dp.
- **Screen padding:** 16 dp horizontal, 16 dp top below app bar, 24 dp above tab bar. Tab bar height 72 dp incl. safe-area.

## 6. Iconography
Lucide (`lucide-react-native`), outline, stroke **1.75**, size **24 dp** (20 dp inline in text, 44 dp in empty states). Lucide outline, 1.75 stroke, 24 dp; icons sit in 40 dp rounded tinted squares on tiles.

| Use | Lucide icon |
|---|---|
| Tab: Home | `house` |
| Tab: Medicines | `pill` |
| Tab: Log | `notebook-pen` |
| Tab: Assistant | `message-circle-heart` |
| Tab: Doctors | `stethoscope` |
| Blood pressure | `heart-pulse` |
| Blood sugar | `droplet` |
| Temperature | `thermometer` |
| Weight | `scale` |
| Symptom | `activity` |
| Reminder | `bell` / `alarm-clock` |
| Offline trust cue | `shield-check` |
| Verified source | `badge-check` |
| Taken / Skip | `check` / `x` |

## 7. Component specs
- **Button** — height 48, padding-x 20, radius pill (999), label style `label`, icon 18 + gap 8.
  - primary: bg `primary`, text `onPrimary`. secondary: transparent, 1 dp border `primary`, text `primary`. ghost: transparent, text `text`. destructive: bg `error`, text `onPrimary` (use only for delete). disabled: opacity 0.38, no ripple. pressed: Android ripple `primary` @ 12% (or opacity 0.85).
- **Text input** — height 52, radius 14, border 1 `border`, bg `surface`, text `body`; label above in `label`; focus border 2 `primary`; error border 2 `error` + caption message below; placeholder `textMuted`.
- **Card** — bg `surface`, radius 20, padding 16, border 1 `border`, elevation level1.
- **List item** — min height 56, padding-x 16, leading icon 24 in 40 dp badge (`surfaceVariant` bg, `primary` icon), title `label`, subtitle `caption` `textMuted`, trailing status pill; divider 1 `border`.
- **Chip** — height 40 (hit area 48), padding-x 16, radius pill; unselected bg `surface` border `border` text `text`; selected bg `primary` text `onPrimary`.
- **Bottom tab bar** — 5 items, bg `surface`, top border 1 `border`; icon 22 in 56×32 indicator pill; active: icon/label `primary` + pill `surfaceVariant`; inactive `textMuted`; label 12 sp weight 600 (always shown).
- **Reading tile** — card; icon badge tinted with the log-type chart colour; label `caption`; value `reading` style (32–40 sp); unit + "Latest reading, <time>" in `caption` `textMuted`. No good/bad colouring.
- **Chart card** — card; title `subtitle`, summary "7-day average …" `caption`; line 2.5 dp (2.5 in this variant); systolic = solid line + hollow circles, diastolic = dashed (6/4) + filled squares; dashed gridlines `border` with numeric labels; always show legend with shape glyphs.
- **Confirmation card** — card with 2 dp `primary` border; overline "RECORD BLOOD PRESSURE" `caption` bold; value `reading`; details `body` `textMuted`; two equal buttons: Confirm (primary, check icon) and Cancel (secondary). After action, replace buttons with a status line (success "Saved" / textMuted "Not saved"). Nothing persists before Confirm.
- **Empty state** — centered, 64 dp `surfaceVariant` badge with 30 dp icon, title `subtitle`, body `textMuted`, one secondary button.
- **Toast/snackbar** — bottom, 16 dp from tab bar, radius 14, bg `text`, text `background`, optional action in `accent`; 4 s; announce via accessibility live region.
- **Notification layout** — small icon = monochrome symbol; title "PAALALAY"; text "Time for your reminder"; actions "Open" only on lock screen (`visibility: private` with generic public version); full details only inside the app after unlock.

## 8. Motion
- Press feedback 100 ms; screen transitions 220 ms; card/sheet enter 250 ms; toast 200 ms in / 150 ms out.
- Easing: standard `cubic-bezier(0.2, 0, 0, 1)`; exit `cubic-bezier(0.3, 0, 1, 1)`.
- No looping, bouncing or celebratory animations.
- **Reduced motion:** when `AccessibilityInfo.isReduceMotionEnabled()` is true, replace all transitions with instant changes or ≤ 100 ms opacity fades.

## 9. Screen layout notes
1. **Home** — greeting + symbol top row; two reading tiles side by side (BP, sugar); today's medicines card; BP trend chart card; trust cue.
2. **Medicines** — title + date subtitle; one card per dose with Taken (primary) / Skip (secondary) buttons, replaced by a status pill once acted on; "Add medicine" form card (name, dose, time, frequency chips, Save).
3. **Log entry** — log-type chips row (BP selected); systolic + diastolic side by side with large numeric inputs; pulse; date + time pickers (native pickers); notes; Save (primary) + Cancel (ghost); trust cue.
4. **Assistant** — header with symbol, "Alalay assistant", "Runs on this device"; assistant text without bubbles, user messages in `primary` bubbles; confirmation card inline; disclaimer caption; composer card with mic, input, send.
5. **Doctors** — search + city fields; specialty chips; result cards (name, specialty in `primary`, place, "Verified on <date> • <source>" strip on `surfaceVariant`); empty state when no match.
6. **Reminder** — lock screen shows only the generic notification. In-app reminder: back link, large bell badge, "Paalala • time", "Time for <medicine>", dose; bottom actions Taken (primary, full width), Snooze 10 min (secondary), Skip (ghost).

## 10. Microcopy samples
| Context | English | Filipino |
|---|---|---|
| Greeting | Good morning, Liza | Kumusta, Liza? |
| Morning | Good morning! You have 2 reminders today. | Magandang umaga! May 2 paalala ka ngayon. |
| Empty meds | No medicines yet. Add one to get reminders. | Wala pang gamot. Magdagdag para may paalala. |
| Empty doctors | No doctors found. Try another specialty or city. | Walang nahanap. Subukan ang ibang espesyalista o lungsod. |
| Lock-screen | PAALALAY: time for your reminder | PAALALAY: oras na ng iyong paalala |
| In-app reminder | Time for Metformin, 500 mg. | Oras na para sa Metformin, 500 mg. |
| Confirm | Save this reading? Nothing is saved until you confirm. | I-save ba ito? Walang mase-save hangga't hindi mo kinukumpirma. |
| Saved | Saved to your log. | Naitala na. |
| Cancelled | Not saved. Nothing changed. | Hindi na-save. Walang binago. |
| Error | Couldn't save. Please try again. | Hindi na-save. Pakisubukang muli. |
| Trust cue | Works offline • Data stays on this device | Gumagana kahit offline • Nasa phone mo lang ang datos |

## 11. theme.ts
```ts
// PAALALAY theme — Variant A (Linaw)
export const theme = {
  "name": "Linaw",
  "colors": {
    "light": {
      "background": "#F4F8F9",
      "surface": "#FFFFFF",
      "surfaceVariant": "#E3EFF1",
      "primary": "#0B6E79",
      "onPrimary": "#FFFFFF",
      "secondary": "#3A5A8C",
      "accent": "#1E8C88",
      "text": "#10272C",
      "textMuted": "#4C6368",
      "border": "#C6D7DA",
      "success": "#1F7A4D",
      "warning": "#8A5A00",
      "error": "#B3261E",
      "info": "#1E5FA8",
      "chart_blood_pressure": "#0072B2",
      "chart_blood_sugar": "#B36B00",
      "chart_temperature": "#C2410C",
      "chart_weight": "#007A5A",
      "chart_symptom": "#A64D86",
      "status_taken": "#1F7A4D",
      "status_skipped": "#5E7074",
      "status_missed": "#8A5A00"
    },
    "dark": {
      "background": "#0B181B",
      "surface": "#132428",
      "surfaceVariant": "#1B3236",
      "primary": "#5FD0D6",
      "onPrimary": "#00363B",
      "secondary": "#A9C3F0",
      "accent": "#7EDCD3",
      "text": "#E6F2F3",
      "textMuted": "#9DB5B9",
      "border": "#2E474B",
      "success": "#6FD39A",
      "warning": "#F2C063",
      "error": "#FFB4AB",
      "info": "#9CC7FF",
      "chart_blood_pressure": "#56B4E9",
      "chart_blood_sugar": "#F0B840",
      "chart_temperature": "#F08A4B",
      "chart_weight": "#3CC79A",
      "chart_symptom": "#E3A0C8",
      "status_taken": "#6FD39A",
      "status_skipped": "#9DB5B9",
      "status_missed": "#F2C063"
    }
  },
  "typography": {
    "fontFamily": {
      "heading": "Manrope",
      "body": "Manrope",
      "numeric": "Manrope"
    },
    "scale": {
      "display": {
        "fontSize": 32,
        "lineHeight": 38,
        "fontWeight": "700",
        "family": "heading"
      },
      "title": {
        "fontSize": 24,
        "lineHeight": 32,
        "fontWeight": "700",
        "family": "heading"
      },
      "subtitle": {
        "fontSize": 18,
        "lineHeight": 26,
        "fontWeight": "600",
        "family": "body"
      },
      "body": {
        "fontSize": 16,
        "lineHeight": 24,
        "fontWeight": "400",
        "family": "body"
      },
      "label": {
        "fontSize": 16,
        "lineHeight": 20,
        "fontWeight": "600",
        "family": "body"
      },
      "caption": {
        "fontSize": 14,
        "lineHeight": 20,
        "fontWeight": "400",
        "family": "body"
      },
      "reading": {
        "fontSize": 40,
        "lineHeight": 48,
        "fontWeight": "700",
        "family": "numeric"
      }
    }
  },
  "spacing": {
    "xxs": 4,
    "xs": 8,
    "sm": 12,
    "md": 16,
    "lg": 24,
    "xl": 32,
    "xxl": 48
  },
  "radius": {
    "sm": 8,
    "md": 14,
    "lg": 20,
    "xl": 28,
    "pill": 999
  },
  "elevation": {
    "level0": 0,
    "level1": 1,
    "level2": 3,
    "level3": 6
  },
  "borderWidth": 1,
  "touchTarget": {
    "min": 48,
    "comfortable": 48
  },
  "screenPadding": 16,
  "icon": {
    "size": 24,
    "strokeWidth": 1.75
  }
} as const;

export type Theme = typeof theme;
export type ColorScheme = keyof typeof theme.colors; // "light" | "dark"
export const getColors = (scheme: ColorScheme) => theme.colors[scheme];
```

## 12. Application checklist for teammates
1. Create/checkout **your own feature branch** (e.g. `theme/linaw`). Never apply on `main` directly.
2. Install fonts: `npx expo install @expo-google-fonts/manrope expo-font`; load them in the root layout before hiding the splash.
3. Add `theme.ts` (section 11) to your theme folder; read the scheme with `useColorScheme()`.
4. Replace hard-coded colours, sizes and fonts in **theme/styling files and shared UI components only** (Button, Input, Card, Chip, TabBar, ReadingTile, ChartCard, ConfirmationCard, EmptyState, Toast).
5. Update the Expo Router tab bar options (icons, colours, label style) per section 7.
6. Swap app icon / adaptive icon / splash per section 2 in `app.json`.
7. **Do not change** business logic, services, database/storage, notification scheduling logic, or AI tool-contract files. Only styling props and copy strings.
8. Keep lock-screen notification text generic.
9. Verify: contrast in light + dark, font scaling at 130%, TalkBack labels, 48 dp targets, reduced motion.
10. Open a PR from your branch with before/after screenshots.

## 13. Assumptions and open questions
- Assumed readings are shown in mmHg, mmol/L, °C and kg; mg/dL support is a setting (open question).
- Assumed Android 8+ (adaptive icons) and Android 13 themed icon support.
- Doctor data and "verified on" dates are illustrative mock data.
- Open: final wordmark should be outlined/redrawn by a designer; confirm Filipino copy with native speakers from target regions; decide whether Taglish should be a user setting.
