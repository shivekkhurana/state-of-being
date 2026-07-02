import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = path.join(process.cwd(), "scripts", "add-workout.js");
const tempDirs: string[] = [];

async function createWorkoutFile(entries: Array<{ date: string; note: string }>) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "workouts-"));
  tempDirs.push(tempDir);
  const workoutPath = path.join(tempDir, "workouts.json");
  await writeFile(workoutPath, `${JSON.stringify(entries, null, 2)}\n`);
  return workoutPath;
}

function runHelper(workoutPath: string, ...args: string[]) {
  return spawnSync("node", [scriptPath, ...args], {
    env: {
      ...process.env,
      WORKOUTS_PATH: workoutPath,
    },
    encoding: "utf8",
  });
}

async function readWorkouts(workoutPath: string) {
  return JSON.parse(await readFile(workoutPath, "utf8"));
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true }))
  );
});

describe("add-workout helper", () => {
  it("adds a valid workout entry with the canonical two-key shape", async () => {
    const workoutPath = await createWorkoutFile([]);
    const result = runHelper(workoutPath, "2026-07-02", "posterior chain workout");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Added workout for 2026-07-02");

    const workouts = await readWorkouts(workoutPath);
    expect(workouts).toEqual([
      {
        date: "2026-07-02",
        note: "posterior chain workout",
      },
    ]);
    expect(Object.keys(workouts[0])).toEqual(["date", "note"]);
  });

  it("keeps entries sorted by date", async () => {
    const workoutPath = await createWorkoutFile([
      { date: "2026-07-03", note: "later" },
    ]);

    const result = runHelper(workoutPath, "2026-07-01", "earlier");

    expect(result.status).toBe(0);
    expect(await readWorkouts(workoutPath)).toEqual([
      { date: "2026-07-01", note: "earlier" },
      { date: "2026-07-03", note: "later" },
    ]);
  });

  it("updates an existing date without creating duplicates", async () => {
    const workoutPath = await createWorkoutFile([
      { date: "2026-07-02", note: "old note" },
    ]);

    const result = runHelper(workoutPath, "2026-07-02", "updated note");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Updated workout note for 2026-07-02");
    expect(await readWorkouts(workoutPath)).toEqual([
      { date: "2026-07-02", note: "updated note" },
    ]);
  });

  it("does not duplicate an existing date when no note is provided", async () => {
    const workoutPath = await createWorkoutFile([
      { date: "2026-07-02", note: "existing note" },
    ]);

    const result = runHelper(workoutPath, "2026-07-02");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Workout already exists for 2026-07-02");
    expect(await readWorkouts(workoutPath)).toEqual([
      { date: "2026-07-02", note: "existing note" },
    ]);
  });
});
