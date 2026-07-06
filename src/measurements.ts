export const measurementTypes = {
  weight: ["kg", "lb"],
  waist: ["cm", "in"],
  chest: ["cm", "in"],
  hips: ["cm", "in"],
  shoulders: ["cm", "in"],
  neck: ["cm", "in"],
  thighs: ["cm", "in"],
  calves: ["cm", "in"],
  ldl: ["mg/dL", "mmol/L"],
  hdl: ["mg/dL", "mmol/L"],
} as const;

export type MeasurementType = keyof typeof measurementTypes;

export type Measurement = {
  date: string;
  type: MeasurementType;
  value: number;
  unit: string;
};

export type AddMeasurementResult = {
  message: string;
  measurements: Measurement[];
};

export const measurementsPath =
  process.env.MEASUREMENTS_PATH || "./vault/measurements.json";

function assertValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Date must be valid.");
  }
}

function assertMeasurementType(type: string): asserts type is MeasurementType {
  if (!Object.hasOwn(measurementTypes, type)) {
    throw new Error(`Unknown measurement type: ${type}`);
  }
}

async function readMeasurements(path = measurementsPath): Promise<Measurement[]> {
  return (await Bun.file(path).json()) as Measurement[];
}

async function writeMeasurements(
  measurements: Measurement[],
  path = measurementsPath,
) {
  await Bun.write(path, `${JSON.stringify(measurements, null, 2)}\n`);
}

export async function addMeasurement(
  date: string,
  type: string,
  rawValue: string | number,
  unit: string,
  path = measurementsPath,
): Promise<AddMeasurementResult> {
  assertValidDate(date);
  assertMeasurementType(type);

  const allowedUnits = measurementTypes[type];
  if (!(allowedUnits as readonly string[]).includes(unit)) {
    throw new Error(
      `Invalid unit for ${type}. Allowed units: ${allowedUnits.join(", ")}`,
    );
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Value must be a non-negative number.");
  }

  const measurements = await readMeasurements(path);
  const existing = measurements.find(
    (measurement) => measurement.date === date && measurement.type === type,
  );

  if (existing) {
    existing.value = value;
    existing.unit = unit;
    measurements.sort(
      (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type),
    );
    await writeMeasurements(measurements, path);
    return {
      message: `Updated ${type} measurement for ${date}`,
      measurements,
    };
  }

  measurements.push({
    date,
    type,
    value,
    unit,
  });
  measurements.sort(
    (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type),
  );
  await writeMeasurements(measurements, path);

  return {
    message: `Added ${type} measurement for ${date}`,
    measurements,
  };
}
