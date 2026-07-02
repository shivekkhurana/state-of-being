# Agent Instructions

## Recording Workouts

- Workouts v2 live in `vault/workoutv2.json`.
- Each workout entry must be an object with exactly two keys:
  - `date`: a `YYYY-MM-DD` string.
  - `note`: a string. Use `""` when there is no note.
- Before recording a workout, always run `git pull origin master`.
- Add workouts with the helper script:

  ```sh
  node scripts/add-workout-v2.js YYYY-MM-DD "optional note"
  ```

- If the user says they worked out today, use the current local date unless they specify another date.
- If the user gives a relative date such as yesterday or tomorrow, convert it to an explicit `YYYY-MM-DD` date before recording it.
- Do not manually edit `vault/workoutv2.json` for normal workout additions unless the helper script is unavailable or broken.
- After recording a workout, commit the changed workout data when appropriate, then run `git push`.
- Preserve the old workout aggregate file at `vault/workouts.json`; do not migrate or overwrite it during normal workout recording.

## Recording Measurements

- Measurements live in `vault/measurements.json`.
- Each measurement entry must be a flat object with exactly four keys:
  - `date`: a `YYYY-MM-DD` string.
  - `type`: a measurement type defined in `scripts/add-measurement.js`.
  - `value`: a non-negative number.
  - `unit`: a unit allowed for the selected measurement type in `scripts/add-measurement.js`.
- The combination of `date` and `type` is unique. Multiple different measurement types can be recorded for the same date.
- Before recording a measurement, always run `git pull origin master`.
- Add or update measurements with the helper script:

  ```sh
  node scripts/add-measurement.js YYYY-MM-DD TYPE VALUE UNIT
  ```

- If the user says the measurement was taken today, use the current local date unless they specify another date.
- If the user gives a relative date such as yesterday or tomorrow, convert it to an explicit `YYYY-MM-DD` date before recording it.
- Do not manually edit `vault/measurements.json` for normal measurement additions unless the helper script is unavailable or broken.
- After recording a measurement, commit the changed measurement data when appropriate, then run `git push`.

## Recording Diet Logs

- Diet logs live in `vault/diet-logs`.
- Use this workflow when the user describes food they ate and wants it recorded.
- Diet notes use `type: diet`.
- Filename format: `vault/diet-logs/YYYY-MM-DD_diet_log.md`.
- Use the current local date unless the user says the meal belongs to a different date.
- If a diet note already exists for that date, update the existing note instead of creating a new one.
- If the user names the meal section, use that section. Otherwise infer the section from the local time:
  - Breakfast: morning meals
  - Lunch: midday/afternoon meals
  - Snacks: small meals between main meals
  - Dinner: evening/night meals
- Preserve the stated foods and quantities as closely as possible.
- Estimate calories, carbs, protein, and fat when exact nutrition data is not provided.
- When estimating macros, be explicit in the item notes if an estimate depends on assumptions such as recipe, portion size, oil/ghee, sugar, brand, or preparation style.
- On every new meal entry, update the daily macro totals in frontmatter.
- Do not overwrite existing meal rows unless the user is correcting a previous entry.

### Diet Frontmatter

Use this frontmatter shape:

```yaml
---
type: diet
date: YYYY-MM-DD
created:
hidden: false
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

| Item | Quantity | Calories | Carbs | Protein | Fat | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |

## Lunch

| Item | Quantity | Calories | Carbs | Protein | Fat | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |

## Snacks

| Item | Quantity | Calories | Carbs | Protein | Fat | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |

## Dinner

| Item | Quantity | Calories | Carbs | Protein | Fat | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
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
- Prefer the existing data-save message for routine vault updates:

  ```text
  🤖 Save data to vault
  ```

- Match nearby history for non-routine changes. Examples:
  - `🛎️ Update workflows to trigger local CD pipeline`
  - `🔗 Add links to rhr and location`
  - `❤️ Add rhr metrics`
  - `🗑️ Delete last two rhr to test workflow`
