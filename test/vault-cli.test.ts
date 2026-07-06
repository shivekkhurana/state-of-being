import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cliPath = path.join(process.cwd(), "src", "cli.ts");
const tempDirs: string[] = [];

async function createJsonFile(prefix: string, filename: string, entries: unknown[]) {
  const tempDir = await mkdtemp(path.join(tmpdir(), prefix));
  tempDirs.push(tempDir);
  const filePath = path.join(tempDir, filename);
  await writeFile(filePath, `${JSON.stringify(entries, null, 2)}\n`);
  return filePath;
}

function runCli(
  env: Record<string, string>,
  ...args: string[]
) {
  return spawnSync("bun", [cliPath, ...args], {
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true })),
  );
});

describe("vault CLI", () => {
  describe("workout add", () => {
    it("adds a valid workout entry with the canonical two-key shape", async () => {
      const workoutPath = await createJsonFile("workouts-", "workouts.json", []);
      const result = runCli(
        { WORKOUTS_PATH: workoutPath },
        "workout",
        "add",
        "2026-07-02",
        "posterior chain workout",
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Added workout for 2026-07-02");

      const workouts = await readJson(workoutPath);
      expect(workouts).toEqual([
        {
          date: "2026-07-02",
          note: "posterior chain workout",
        },
      ]);
      expect(Object.keys(workouts[0])).toEqual(["date", "note"]);
    });

    it("keeps entries sorted by date", async () => {
      const workoutPath = await createJsonFile("workouts-", "workouts.json", [
        { date: "2026-07-03", note: "later" },
      ]);

      const result = runCli(
        { WORKOUTS_PATH: workoutPath },
        "workout",
        "add",
        "2026-07-01",
        "earlier",
      );

      expect(result.status).toBe(0);
      expect(await readJson(workoutPath)).toEqual([
        { date: "2026-07-01", note: "earlier" },
        { date: "2026-07-03", note: "later" },
      ]);
    });

    it("updates an existing date without creating duplicates", async () => {
      const workoutPath = await createJsonFile("workouts-", "workouts.json", [
        { date: "2026-07-02", note: "old note" },
      ]);

      const result = runCli(
        { WORKOUTS_PATH: workoutPath },
        "workout",
        "add",
        "2026-07-02",
        "updated note",
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Updated workout note for 2026-07-02");
      expect(await readJson(workoutPath)).toEqual([
        { date: "2026-07-02", note: "updated note" },
      ]);
    });

    it("does not duplicate an existing date when no note is provided", async () => {
      const workoutPath = await createJsonFile("workouts-", "workouts.json", [
        { date: "2026-07-02", note: "existing note" },
      ]);

      const result = runCli(
        { WORKOUTS_PATH: workoutPath },
        "workout",
        "add",
        "2026-07-02",
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Workout already exists for 2026-07-02");
      expect(await readJson(workoutPath)).toEqual([
        { date: "2026-07-02", note: "existing note" },
      ]);
    });
  });

  describe("measurement add", () => {
    it("adds a valid measurement entry", async () => {
      const measurementsPath = await createJsonFile(
        "measurements-",
        "measurements.json",
        [],
      );

      const result = runCli(
        { MEASUREMENTS_PATH: measurementsPath },
        "measurement",
        "add",
        "2026-07-02",
        "waist",
        "84",
        "cm",
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Added waist measurement for 2026-07-02");
      expect(await readJson(measurementsPath)).toEqual([
        {
          date: "2026-07-02",
          type: "waist",
          value: 84,
          unit: "cm",
        },
      ]);
    });

    it("updates an existing measurement for the same date and type", async () => {
      const measurementsPath = await createJsonFile(
        "measurements-",
        "measurements.json",
        [{ date: "2026-07-02", type: "waist", value: 84, unit: "cm" }],
      );

      const result = runCli(
        { MEASUREMENTS_PATH: measurementsPath },
        "measurement",
        "add",
        "2026-07-02",
        "waist",
        "86.5",
        "cm",
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Updated waist measurement for 2026-07-02");
      expect(await readJson(measurementsPath)).toEqual([
        {
          date: "2026-07-02",
          type: "waist",
          value: 86.5,
          unit: "cm",
        },
      ]);
    });

    it("rejects invalid units for a measurement type", async () => {
      const measurementsPath = await createJsonFile(
        "measurements-",
        "measurements.json",
        [],
      );

      const result = runCli(
        { MEASUREMENTS_PATH: measurementsPath },
        "measurement",
        "add",
        "2026-07-02",
        "waist",
        "84",
        "kg",
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Invalid unit for waist");
      expect(await readJson(measurementsPath)).toEqual([]);
    });
  });
});
