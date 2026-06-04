#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const workoutPath = path.join(__dirname, "..", "vault", "workoutv2.json");
const [dateArg, ...noteParts] = process.argv.slice(2);
const note = noteParts.join(" ").trim();

function usage() {
  console.error("Usage: node scripts/add-workout-v2.js YYYY-MM-DD [note]");
  process.exit(1);
}

function assertValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    usage();
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    usage();
  }
}

if (!dateArg) {
  usage();
}

assertValidDate(dateArg);

const workouts = JSON.parse(fs.readFileSync(workoutPath, "utf8"));
const existing = workouts.find((workout) => workout.date === dateArg);

if (existing) {
  if (note) {
    existing.note = note;
    fs.writeFileSync(workoutPath, `${JSON.stringify(workouts, null, 2)}\n`);
    console.log(`Updated workout note for ${dateArg}`);
  } else {
    console.log(`Workout already exists for ${dateArg}`);
  }
  process.exit(0);
}

workouts.push({ date: dateArg, note });
workouts.sort((a, b) => a.date.localeCompare(b.date));

fs.writeFileSync(workoutPath, `${JSON.stringify(workouts, null, 2)}\n`);
console.log(`Added workout for ${dateArg}`);
