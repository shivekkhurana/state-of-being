type DietMacroEntry = {
  date: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
};

type DietMacroIndex = Record<string, DietMacroEntry>;

type GenerateDietMacrosIndexOptions = {
  logsDir?: string;
  savePath?: string;
};

function parseNumberField(
  frontmatter: Record<string, string>,
  field: string
): number {
  const value = Number(frontmatter[field]);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${field} value: ${frontmatter[field]}`);
  }

  return value;
}

function parseDietLogFrontmatter(markdown: string): DietMacroEntry {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    throw new Error("Diet log is missing frontmatter");
  }

  const frontmatter = Object.fromEntries(
    frontmatterMatch[1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(":");

        if (separatorIndex === -1) {
          throw new Error(`Invalid frontmatter line: ${line}`);
        }

        return [
          line.slice(0, separatorIndex).trim(),
          line.slice(separatorIndex + 1).trim(),
        ];
      })
  );

  const date = frontmatter.date;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid diet log date: ${date}`);
  }

  return {
    date,
    calories: parseNumberField(frontmatter, "diet_total_calories"),
    carbs_g: parseNumberField(frontmatter, "diet_total_carbs_g"),
    protein_g: parseNumberField(frontmatter, "diet_total_protein_g"),
    fat_g: parseNumberField(frontmatter, "diet_total_fat_g"),
  };
}

async function generateDietMacrosIndex({
  logsDir = "./vault/diet-logs",
  savePath = "./vault/macros.json",
}: GenerateDietMacrosIndexOptions = {}) {
  const glob = new Bun.Glob("*_diet_log.md");
  const entries: DietMacroEntry[] = [];

  for await (const fileName of glob.scan(logsDir)) {
    const markdown = await Bun.file(`${logsDir}/${fileName}`).text();
    entries.push(parseDietLogFrontmatter(markdown));
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  const index: DietMacroIndex = Object.fromEntries(
    entries.map((entry) => [entry.date, entry])
  );

  await Bun.write(savePath, `${JSON.stringify(index, null, 2)}\n`);

  return {
    savePath,
    count: entries.length,
    msg: "Diet macros index generated",
  };
}

export {
  DietMacroEntry,
  DietMacroIndex,
  generateDietMacrosIndex,
  parseDietLogFrontmatter,
};
