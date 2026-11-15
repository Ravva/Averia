# DESIGN.md — Averia «Graphite Ledger»

A precision measuring instrument for school performance data. Cool graphite neutrals, one indigo accent for interaction, and the fixed grade palette as the only warm signal. Replaces the earlier warm "school atlas" world.

## Color

Color commits as hairline structure and data, not washes. Neutrals are cool; warmth is reserved for grades.

### Neutral ramp (light / dark)
| Token | Role | Light | Dark |
|---|---|---|---|
| `--paper` | page ground | `#F6F7F9` | `#101216` |
| `--paper-2` | cards, panels | `#FFFFFF` | `#171A20` |
| `--band` | fill, hover | `#ECEEF2` | `#1D2129` |
| `--zebra` | row alternation | `#F0F2F5` | `#1A1E25` |
| `--rule` | primary lines | `#D3D7DE` | `#2E333D` |
| `--rule-2` | soft dividers | `#E6E9EE` | `#23272F` |
| `--ink` | primary text | `#16181D` | `#E7E9EE` |
| `--ink-2` | secondary text | `#565D6B` | `#9AA3B2` |

### Grade palette (fixed; the only warm hues)
| Token | Mark | Light | Dark |
|---|---|---|---|
| `--m5` | 5 отлично | `#4C9A6A` | `#5FB584` |
| `--m4` | 4 хорошо | `#C9A227` | `#DCBB42` |
| `--m3` | 3 удовлетворительно | `#C77B3C` | `#DB9155` |
| `--m2` | 2 неудовлетворительно | `#DC2626` | `#EB514A` |

### Accent (interaction only)
`--accent` indigo `#4F46E5` / dark `#8B85F0`; `--accent-ink` on-accent text; `--accent-soft` tinted fill. Used for primary buttons, focus rings, selection, checked controls, meter fill. Never for data.

## Typography
- Text face: Golos Text (already self-hosted via next/font). Display serif (Spectral) retained for report titles only.
- Figures: monospace + `font-variant-numeric: tabular-nums` so columns never jump.
- Scale: Display 44/1.05 · Title 30/1.15 · Heading 20/1.3 · Body 16/1.5 · Small 13/1.45 · Micro 11/1.2 (uppercase, +0.08em tracking).
- Reading measure 60–75ch; tracking floor −0.03em.

## Space, shape, elevation
- Base step 8px. Radii: 4 / 6 / 8 / 12px (cards 12px, controls 6–8px, pills for small controls).
- Lines: 1px `--rule` for sections/tables, 1px `--rule-2` for rows, 2px `--ink` only for the masthead rule.
- Elevation declared once: flat surfaces use borders; overlays use `--shadow-1` / `--shadow-2` (offset + soft blur). No nested cards.

## Components (ui-sdk)
Unstyled ui-sdk parts styled with Tailwind + tokens: Button, Toggle, Switch, Checkbox, Tabs, Select, Input/Field, Dialog, Popover, Tooltip, Meter. State via data attributes (`data-pressed`, `data-checked`, `data-selected`, `data-highlighted`). Focus ring = 2px `--accent`.

## Data-viz language
- Charts drawn from data at runtime (SVG), never illustrated.
- Bar charts: 1px dashed grid, labeled axes, value at bar end, bar color follows the average-mark scale (≥4.50 green, 3.50–4.49 ochre, below terracotta/red).
- Distribution: single stacked bar + legend carrying mark, label, count, share — color never the only signal.
- Example data: class 9-Ю, 09.11.2026 (28 students, 16 subjects, 445 marks, avg 4.55).

## Themes
Light and dark are equal citizens, switchable from the masthead (keyboard-reachable, `aria-pressed`). Dark is a true graphite surface, not inverted paper; grade colors lighten to hold WCAG AA contrast, accent shifts lighter.

## Accessibility
- WCAG AA contrast in both themes.
- Color is never the sole carrier of meaning.
- Body text ≥16px on reports; tabular numerals in data.
- Metric definitions travel with the numbers (успеваемость / качество знаний spelled out).
