#!/bin/bash
set -euo pipefail

TODAY=$(date +%Y-%m-%d)
VAULT="/Users/shivekkhurana/Wip/shivekkhurana/state-of-being/vault"

# Diet
DIET_FILE="$VAULT/diet-logs/${TODAY}_diet_log.md"
if [ -f "$DIET_FILE" ]; then
  CAL=$(grep 'diet_total_calories:' "$DIET_FILE" | awk '{print $2}')
  CARB=$(grep 'diet_total_carbs_g:' "$DIET_FILE" | awk '{print $2}')
  PROT=$(grep 'diet_total_protein_g:' "$DIET_FILE" | awk '{print $2}')
  FAT=$(grep 'diet_total_fat_g:' "$DIET_FILE" | awk '{print $2}')
else
  CAL=0; CARB=0; PROT=0; FAT=0
fi

# Workout
if grep -q "\"date\": \"$TODAY\"" "$VAULT/workouts.json"; then
  WORKOUT="✅"
else
  WORKOUT="❌"
fi

# Measurements
MEAS_FILE="$VAULT/measurements.json"
WEIGHT=$(python3 -c "
import json
data = json.load(open('$MEAS_FILE'))
matches = [e for e in data if e['date']=='$TODAY' and e['type']=='weight']
print(matches[0]['value'] if matches else '—')
" 2>/dev/null || echo "—")

REPORT="📊 $TODAY

🍽️  ${CAL:-0} kcal | ${CARB:-0}g C | ${PROT:-0}g P | ${FAT:-0}g F
🏋️  Workout: $WORKOUT
⚖️  Weight: ${WEIGHT} kg"

echo "$REPORT"

osascript -e "display notification \"$REPORT\" with title \"Daily Report\" sound name \"Glass\""
