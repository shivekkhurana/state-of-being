import { afterAll, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import {
  generateDietMacrosIndex,
  parseDietLogFrontmatter,
} from "@src/diet";

const testDir = "/tmp/state-of-being-diet-test";

describe("parseDietLogFrontmatter", () => {
  it("extracts macro totals with public index keys", () => {
    const entry = parseDietLogFrontmatter(`---
date: 2026-07-05
diet_total_calories: 1578
diet_total_carbs_g: 215.5
diet_total_protein_g: 81.0
diet_total_fat_g: 48.0
---

# Diet log
`);

    expect(entry).toEqual({
      date: "2026-07-05",
      calories: 1578,
      carbs_g: 215.5,
      protein_g: 81,
      fat_g: 48,
    });
  });
});

describe("generateDietMacrosIndex", () => {
  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("writes a date-keyed macros index from diet logs", async () => {
    const logsDir = `${testDir}/diet-logs`;
    const savePath = `${testDir}/macros.json`;

    await rm(testDir, { recursive: true, force: true });
    await mkdir(logsDir, { recursive: true });

    await Bun.write(
      `${logsDir}/2026-07-05_diet_log.md`,
      `---
date: 2026-07-05
diet_total_calories: 1578
diet_total_carbs_g: 215.5
diet_total_protein_g: 81.0
diet_total_fat_g: 48.0
---
`
    );

    await Bun.write(
      `${logsDir}/2026-07-04_diet_log.md`,
      `---
date: 2026-07-04
diet_total_calories: 1062
diet_total_carbs_g: 95.5
diet_total_protein_g: 127.0
diet_total_fat_g: 15.9
---
`
    );

    const result = await generateDietMacrosIndex({ logsDir, savePath });
    const index = await Bun.file(savePath).json();

    expect(result.count).toBe(2);
    expect(Object.keys(index)).toEqual(["2026-07-04", "2026-07-05"]);
    expect(index["2026-07-04"]).toEqual({
      date: "2026-07-04",
      calories: 1062,
      carbs_g: 95.5,
      protein_g: 127,
      fat_g: 15.9,
    });
  });
});
