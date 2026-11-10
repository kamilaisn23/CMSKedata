---
name: kedata-ponytail-help
description: 'Quick reference for the Kedata ponytail levels, skills and commands. One-shot display. Use for /kedata-ponytail-help, "ponytail help", "how do I use ponytail". Adapted from ponytail (DietrichGebert, MIT).'
version: 5.3.3
author: Kedata Indonesia (adapted from DietrichGebert / ponytail, MIT)
---

# Kedata Ponytail Help

* User command: `/kedata-ponytail-help`

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What changes |
|-------|---------|--------------|
| **Lite** | `/kedata-ponytail lite` | Build what was asked, name the smaller option in one line. |
| **Full** | `/kedata-ponytail` | The smallest complete change, a check where the logic needs one, and a reply that names what was skipped and any risk. Default. |
| **Ultra** | `/kedata-ponytail ultra` | Also questions the request and pushes back before building. |

Level sticks until changed or session end.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **kedata-ponytail** | `/kedata-ponytail` | Lazy mode itself: least new code, clear replies that name skipped work and risks. |
| **kedata-ponytail-review** | `/kedata-ponytail-review` | Lean review of a diff: bugs, security, load, missing tests, speed, what to cut. Pairs with `/kedata-review` (artifact compliance). |
| **kedata-ponytail-audit** | `/kedata-ponytail-audit` | The same lean review for the whole repo, ranked. Pairs with `/kedata-audit` (compliance → tracker issues). |
| **kedata-ponytail-debt** | `/kedata-ponytail-debt` | Harvest `shortcut:` comments into a tracked ledger. |
| **kedata-ponytail-gain** | `/kedata-ponytail-gain` | Measured-impact scoreboard: less code, less cost, more speed. |
| **kedata-ponytail-help** | `/kedata-ponytail-help` | This card. |

## What ponytail never cuts

Validation at trust boundaries, error handling that prevents data loss, security, accessibility, and anything an approved Kedata artifact requires (acceptance criteria, contract shapes, Swagger, activity logging). Shrinking those goes through `/kedata-change`.

## Deactivate

Say "stop ponytail" or "normal mode". Resume anytime with `/kedata-ponytail`.
`/kedata-ponytail off` also works.

## More

Upstream docs + examples: https://github.com/DietrichGebert/ponytail
Source, version and licence for this adaptation: `THIRD_PARTY_NOTICES.md`.
