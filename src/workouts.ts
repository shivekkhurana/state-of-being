export type Workout = {
  date: string;
  note: string;
};

export type AddWorkoutResult = {
  message: string;
  workouts: Workout[];
};

export const workoutsPath = process.env.WORKOUTS_PATH || "./vault/workouts.json";

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

async function readWorkouts(path = workoutsPath): Promise<Workout[]> {
  return (await Bun.file(path).json()) as Workout[];
}

async function writeWorkouts(workouts: Workout[], path = workoutsPath) {
  await Bun.write(path, `${JSON.stringify(workouts, null, 2)}\n`);
}

export async function addWorkout(
  date: string,
  note = "",
  path = workoutsPath,
): Promise<AddWorkoutResult> {
  assertValidDate(date);

  const normalizedNote = note.trim();
  const workouts = await readWorkouts(path);
  const existing = workouts.find((workout) => workout.date === date);

  if (existing) {
    if (normalizedNote) {
      existing.note = normalizedNote;
      await writeWorkouts(workouts, path);
      return {
        message: `Updated workout note for ${date}`,
        workouts,
      };
    }

    return {
      message: `Workout already exists for ${date}`,
      workouts,
    };
  }

  workouts.push({ date, note: normalizedNote });
  workouts.sort((a, b) => a.date.localeCompare(b.date));
  await writeWorkouts(workouts, path);

  return {
    message: `Added workout for ${date}`,
    workouts,
  };
}
