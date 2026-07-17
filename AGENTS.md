# Agent Instructions

## Recording Workouts

- Workouts live in `vault/workouts.json`.
- Each workout entry must be an object with exactly two keys:
  - `date`: a `YYYY-MM-DD` string.
  - `note`: a string. Use `""` when there is no note.
- Before recording a workout, always run `git pull origin master`.
- Add workouts with the CLI:

  ```sh
  bun src/cli.ts workout add YYYY-MM-DD "optional note"
  ```

- If the user says they worked out today, use the current local date unless they specify another date.
- If the user gives a relative date such as yesterday or tomorrow, convert it to an explicit `YYYY-MM-DD` date before recording it.
- If workout notes are provided in any language other than English, translate them to English before saving.
- Do not manually edit `vault/workouts.json` for normal workout additions unless the CLI is unavailable or broken.
- After recording a workout, commit the changed workout data when appropriate, then run `git push`.

## Recording Measurements

- Measurements live in `vault/measurements.json`.
- Each measurement entry must be a flat object with exactly four keys:
  - `date`: a `YYYY-MM-DD` string.
  - `type`: a measurement type defined in `src/measurements.ts`.
  - `value`: a non-negative number.
  - `unit`: a unit allowed for the selected measurement type in `src/measurements.ts`.
- The combination of `date` and `type` is unique. Multiple different measurement types can be recorded for the same date.
- Before recording a measurement, always run `git pull origin master`.
- Add or update measurements with the CLI:

  ```sh
  bun src/cli.ts measurement add YYYY-MM-DD TYPE VALUE UNIT
  ```

- If the user says the measurement was taken today, use the current local date unless they specify another date.
- If the user gives a relative date such as yesterday or tomorrow, convert it to an explicit `YYYY-MM-DD` date before recording it.
- Do not manually edit `vault/measurements.json` for normal measurement additions unless the CLI is unavailable or broken.
- After recording a measurement, commit the changed measurement data when appropriate, then run `git push`.

## Recording Diet Logs

- Diet logs live in `vault/diet-logs`.
- Use this workflow when the user describes food they ate and wants it recorded.
- Diet notes use `type: diet`.
- Filename format: `vault/diet-logs/YYYY-MM-DD_diet_log.md`.
- Use the current local date unless the user says the meal belongs to a different date.
- Each food row must include the actual eating timestamp in GMT/UTC as an ISO 8601 string, such as `2026-07-04T08:30:00Z`.
- If the user says they ate something now or today without giving a time, use the current local date and time, then convert it to GMT/UTC for the row.
- If the user gives a local eating time without a timezone, interpret it in the current local timezone and convert it to GMT/UTC before saving.
- If a diet note already exists for that date, update the existing note instead of creating a new one.
- If the user names the meal section, use that section. Otherwise infer the section from the local time (do not ask the user):
  - Breakfast: morning meals
  - Lunch: midday/afternoon meals
  - Snacks: small meals between main meals
  - Dinner: evening/night meals
- Preserve the stated foods and quantities as closely as possible.
- If diet notes are provided in any language other than English, translate them to English before saving.
- If a stated ingredient or prepared item can refer to meaningfully different versions, such as sweet vs salty lassi, ask the user to confirm which version before estimating macros.
- Estimate calories, carbs, protein, and fat when exact nutrition data is not provided.
- When estimating macros, be explicit in the item notes if an estimate depends on assumptions such as recipe, portion size, oil/ghee, sugar, brand, or preparation style.
- On every new meal entry, update the daily macro totals in frontmatter.
- Do not overwrite existing meal rows unless the user is correcting a previous entry.
- After logging a diet entry, always output the macros (calories, carbs, protein, fat) for the logged items to the user.

### Diet Frontmatter

Use this frontmatter shape:

```yaml
---
date: YYYY-MM-DD
diet_total_calories: 0
diet_total_carbs_g: 0
diet_total_protein_g: 0
diet_total_fat_g: 0
---
```

### Diet Body Format

Use these sections:

```md
# Diet log

## Breakfast

| Timestamp (GMT) | Item | Quantity | Calories | Carbs | Protein | Fat | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |

## Lunch

| Timestamp (GMT) | Item | Quantity | Calories | Carbs | Protein | Fat | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |

## Snacks

| Timestamp (GMT) | Item | Quantity | Calories | Carbs | Protein | Fat | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |

## Dinner

| Timestamp (GMT) | Item | Quantity | Calories | Carbs | Protein | Fat | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
```

### Diet Macro Rules

- Use `kcal` for calories and `g` for carbs, protein, and fat.
- Round calories to the nearest whole number.
- Round macros to one decimal place when useful.
- If the user gives a packaged food label, prefer the label over generic estimates.
- Keep calorie and protein estimates conservative when details are unclear; do not use optimistic high-protein or low-calorie assumptions for vague quantities such as "one cup of milk."
- If a quantity is vague, make a reasonable estimate and mention the assumption in `Notes`.

## Git Commit Messages

- Use a short one-line subject.
- Start the subject with an emoji, then a space, then a Title Case imperative phrase.
- Before committing non-routine changes, check recent history and staged changes:

  ```sh
  git log --oneline -30
  git status
  git diff --staged
  ```

- Choose the emoji from the primary change type. Common patterns:
  - `🤖` automated saves or vault data updates.
  - `🛎️` workflow, deployment, or CI/CD changes.
  - `🔗` links, connections, or integrations.
  - `🗑️` deletions or removals.
  - `❤️` health metrics or new tracking features.
  - `🧹` cleanup or refactoring.
  - `🐞` bug fixes.
  - `🪵` logging or diagnostics.
  - `📍` location-related changes.
  - `📋` validation, checks, or configuration.
  - `📝` documentation updates.
  - `🔧` tooling or build-system changes.
- Prefer the existing data-save message for routine vault updates:

  ```text
  🤖 Save data to vault
  ```

- Match nearby history for non-routine changes. Examples:
  - `🛎️ Update workflows to trigger local CD pipeline`
  - `🔗 Add links to rhr and location`
  - `❤️ Add rhr metrics`
  - `🗑️ Delete last two rhr to test workflow`
