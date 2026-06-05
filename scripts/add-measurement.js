#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const measurementsPath = path.join(__dirname, "..", "vault", "measurements.json");
const [dateArg, typeArg, valueArg, unitArg] = process.argv.slice(2);

const measurementTypes = {
  waist: ["cm", "in"],
  belly: ["cm", "in"],
  shoulders: ["cm", "in"],
  thighs: ["cm", "in"],
  calves: ["cm", "in"],
  ldl: ["mg/dL", "mmol/L"],
  hdl: ["mg/dL", "mmol/L"],
};

function usage(message) {
  if (message) {
    console.error(message);
  }

  console.error(
    "Usage: node scripts/add-measurement.js YYYY-MM-DD TYPE VALUE UNIT",
  );
  console.error(`Types: ${Object.keys(measurementTypes).join(", ")}`);
  process.exit(1);
}

function assertValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    usage("Date must use YYYY-MM-DD format.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    usage("Date must be valid.");
  }
}

if (!dateArg || !typeArg || valueArg === undefined || !unitArg) {
  usage();
}

assertValidDate(dateArg);

const allowedUnits = measurementTypes[typeArg];
if (!allowedUnits) {
  usage(`Unknown measurement type: ${typeArg}`);
}

if (!allowedUnits.includes(unitArg)) {
  usage(
    `Invalid unit for ${typeArg}. Allowed units: ${allowedUnits.join(", ")}`,
  );
}

const value = Number(valueArg);
if (!Number.isFinite(value) || value < 0) {
  usage("Value must be a non-negative number.");
}

const measurements = JSON.parse(fs.readFileSync(measurementsPath, "utf8"));
const existing = measurements.find(
  (measurement) =>
    measurement.date === dateArg && measurement.type === typeArg,
);

if (existing) {
  existing.value = value;
  existing.unit = unitArg;
  console.log(`Updated ${typeArg} measurement for ${dateArg}`);
} else {
  measurements.push({
    date: dateArg,
    type: typeArg,
    value,
    unit: unitArg,
  });
  console.log(`Added ${typeArg} measurement for ${dateArg}`);
}

measurements.sort(
  (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type),
);

fs.writeFileSync(measurementsPath, `${JSON.stringify(measurements, null, 2)}\n`);
