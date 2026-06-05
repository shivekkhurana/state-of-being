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
