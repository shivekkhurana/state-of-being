import { z, ZodError } from "zod";

type WriterFunction = (path: string, content: string) => Promise<void>;
type ReaderFunction = (path: string) => Promise<string>;
type CommentFunction = (comment: string) => Promise<void>;

// Zod schemas for individual metric data types
const HeartRateDataSchema = z.object({
  Max: z.number().optional(),
  Avg: z.number().optional(),
  Min: z.number().optional(),
  source: z.string().optional(),
  date: z.string(),
}).passthrough();

const HeartRateVariabilityDataSchema = z.object({
  qty: z.number(),
  date: z.string(),
}).passthrough();

const SleepAnalysisDataSchema = z.object({
  inBedStart: z.string().optional(),
  awake: z.number().optional(),
  source: z.string().optional(),
  sleepStart: z.string().optional(),
  totalSleep: z.number().optional(),
  sleepEnd: z.string().optional(),
  date: z.string(),
  deep: z.number().optional(),
  rem: z.number().optional(),
  inBedEnd: z.string().optional(),
  inBed: z.number().optional(),
  core: z.number().optional(),
  asleep: z.number().optional(),
}).passthrough();

const BodyTemperatureDataSchema = z.object({
  date: z.string(),
  qty: z.number(),
}).passthrough();

// Union type for all health metric data (no name discriminator on data items)
const HealthMetricDataSchema = z.union([
  HeartRateDataSchema,
  HeartRateVariabilityDataSchema,
  SleepAnalysisDataSchema,
  BodyTemperatureDataSchema,
]);

// Metric schemas with discriminated unions based on name
const HeartRateMetricSchema = z.object({
  name: z.literal("heart_rate"),
  units: z.literal("count/min"),
  data: z.array(HeartRateDataSchema),
});

const HeartRateVariabilityMetricSchema = z.object({
  name: z.literal("heart_rate_variability"),
  units: z.literal("ms"),
  data: z.array(HeartRateVariabilityDataSchema),
});

const SleepAnalysisMetricSchema = z.object({
  name: z.literal("sleep_analysis"),
  units: z.literal("hr"),
  data: z.array(SleepAnalysisDataSchema),
});

const BodyTemperatureMetricSchema = z.object({
  name: z.literal("body_temperature"),
  units: z.literal("degC"),
  data: z.array(BodyTemperatureDataSchema),
});

const HealthMetricSchema = z.discriminatedUnion("name", [
  HeartRateMetricSchema,
  HeartRateVariabilityMetricSchema,
  SleepAnalysisMetricSchema,
  BodyTemperatureMetricSchema,
]);

// Lenient schema that allows unknown metrics to pass through
// Unknown metrics will be validated during processing
const LenientMetricSchema = z.object({
  name: z.string(),
  units: z.string(),
  data: z.array(z.any()),
}).passthrough();

const HealthDataExportSchema = z.object({
  data: z.object({
    metrics: z.array(LenientMetricSchema),
  }),
});

const HealthDataFileSchema = z.object({
  metrics: z.array(
    z.union([
      HeartRateDataSchema,
      HeartRateVariabilityDataSchema,
      SleepAnalysisDataSchema,
      BodyTemperatureDataSchema,
    ])
  ),
});

const HealthDataIssueSchema = z.object({
  title: z.string(),
  body: z.string(),
  createdAt: z.string().optional(),
});

// Inferred TypeScript types from Zod schemas
export type HealthDataIssue = z.infer<typeof HealthDataIssueSchema>;
export type HeartRateData = z.infer<typeof HeartRateDataSchema>;
export type HeartRateVariabilityData = z.infer<typeof HeartRateVariabilityDataSchema>;
export type SleepAnalysisData = z.infer<typeof SleepAnalysisDataSchema>;
export type BodyTemperatureData = z.infer<typeof BodyTemperatureDataSchema>;
export type HealthMetricData =
  | HeartRateData
  | HeartRateVariabilityData
  | SleepAnalysisData
  | BodyTemperatureData;
export type HeartRateMetric = z.infer<typeof HeartRateMetricSchema>;
export type HeartRateVariabilityMetric = z.infer<typeof HeartRateVariabilityMetricSchema>;
export type SleepAnalysisMetric = z.infer<typeof SleepAnalysisMetricSchema>;
export type BodyTemperatureMetric = z.infer<typeof BodyTemperatureMetricSchema>;
export type HealthMetric = z.infer<typeof HealthMetricSchema>;
export type HealthDataExport = z.infer<typeof HealthDataExportSchema>;
export type HealthDataFile = z.infer<typeof HealthDataFileSchema>;

const METRIC_TO_FILE_MAP: Record<string, string> = {
  heart_rate: "hr.json",
  heart_rate_variability: "hrv.json",
  body_temperature: "bodySurfaceTemp.json",
  sleep_analysis: "sleep.json",
};

const EXPECTED_ISSUE_TITLE = "HealthDataExport";

/**
 * Validates that the issue title matches the expected format
 */
export function validateIssueTitle(title: string): {
  isValid: boolean;
  error?: string;
} {
  if (title !== EXPECTED_ISSUE_TITLE) {
    return {
      isValid: false,
      error: `Issue title "${title}" does not match "${EXPECTED_ISSUE_TITLE}"`,
    };
  }
  return { isValid: true };
}

/**
 * Parses and validates the health data JSON from issue body using Zod
 */
export function parseHealthData(body: string): {
  success: boolean;
  data?: HealthDataExport;
  error?: string;
} {
  try {
    const parsedJson = JSON.parse(body);
    const validationResult = HealthDataExportSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      const error: ZodError = validationResult.error;
      const errorMessages = error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ");
      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
      };
    }

    return { success: true, data: validationResult.data };
  } catch (error) {
    return {
      success: false,
      error: `Error parsing health data: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Gets the file path for a given metric name
 */
export function getMetricFilePath(
  metricName: string,
  basePath: string
): string | null {
  const fileName = METRIC_TO_FILE_MAP[metricName];
  if (!fileName) {
    return null;
  }
  return `${basePath}/${fileName}`;
}

/**
 * Reads existing data from file, or returns empty structure if file doesn't exist
 * Validates data using Zod schema
 */
export async function readExistingData(
  filePath: string,
  reader: ReaderFunction
): Promise<HealthDataFile> {
  try {
    const existingContent = await reader(filePath);
    const parsedJson = JSON.parse(existingContent);
    
    // Validate with Zod schema
    const validationResult = HealthDataFileSchema.safeParse(parsedJson);
    
    if (!validationResult.success) {
      // If validation fails, return empty structure to start fresh
      const error: ZodError = validationResult.error;
      console.warn(
        `Validation failed for ${filePath}: ${error.issues
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join("; ")}`
      );
      return { metrics: [] };
    }

    return validationResult.data;
  } catch (error) {
    // File doesn't exist or is empty, start fresh
    return { metrics: [] };
  }
}

/**
 * Gets a unique identifier for a metric data item (for deduplication)
 */
function getItemIdentifier(item: HealthMetricData): string {
  return item.date || JSON.stringify(item);
}

/**
 * Checks if a sleep entry is incomplete (only has source and date)
 */
function isIncompleteSleepEntry(item: HealthMetricData): boolean {
  if ('source' in item && 'date' in item) {
    // Check if it's a sleep entry by looking for sleep-specific fields
    const hasSleepFields = 'totalSleep' in item || 'inBedStart' in item || 'sleepStart' in item;
    // If it has source and date but no sleep-specific fields, it's incomplete
    if (!hasSleepFields) {
      const keys = Object.keys(item);
      // An incomplete entry should only have source and date (2 keys)
      return keys.length === 2;
    }
  }
  return false;
}

/**
 * Filters out duplicate metric entries based on date.
 * Also removes incomplete entries from existing data when complete entries are available.
 */
export function deduplicateMetrics(
  existingMetrics: HealthMetricData[],
  newMetrics: HealthMetricData[]
): {
  filteredNewMetrics: HealthMetricData[];
  filteredExistingMetrics: HealthMetricData[];
} {
  // Create a map of new metric dates to their data
  const newMetricsByDate = new Map<string, HealthMetricData[]>();
  for (const item of newMetrics) {
    const date = item.date;
    if (date) {
      if (!newMetricsByDate.has(date)) {
        newMetricsByDate.set(date, []);
      }
      newMetricsByDate.get(date)!.push(item);
    }
  }

  // Filter out incomplete entries from existing data if we have complete entries for the same date
  const filteredExistingMetrics = existingMetrics.filter((existing) => {
    const date = existing.date;
    if (!date) return true; // Keep entries without dates
    
    // Check if we have new metrics for this date
    const newMetricsForDate = newMetricsByDate.get(date);
    if (!newMetricsForDate || newMetricsForDate.length === 0) {
      return true; // No new data for this date, keep existing
    }

    // Check if the existing entry is incomplete
    if (isIncompleteSleepEntry(existing)) {
      // We have new data for this date, remove the incomplete entry
      return false;
    }

    // Existing entry is complete, check if any new entry has the same identifier
    const existingIdentifier = getItemIdentifier(existing);
    const hasDuplicate = newMetricsForDate.some(
      (newItem) => getItemIdentifier(newItem) === existingIdentifier
    );
    
    // Remove if there's a duplicate (same date and identifier)
    return !hasDuplicate;
  });

  // Now filter new metrics against the cleaned existing metrics
  const existingIdentifiers = new Set(
    filteredExistingMetrics.map((m) => getItemIdentifier(m))
  );

  const filteredNewMetrics = newMetrics.filter((item) => {
    const itemIdentifier = getItemIdentifier(item);
    return !existingIdentifiers.has(itemIdentifier);
  });

  return {
    filteredNewMetrics,
    filteredExistingMetrics,
  };
}

/**
 * Processes a single metric and saves it to the appropriate file
 */
export async function processMetric(
  metric: any, // Lenient type - can be any metric structure
  basePath: string,
  writer: WriterFunction,
  reader: ReaderFunction
): Promise<{ success: boolean; message: string }> {
  // Check if this is a known metric and validate against strict schema
  const filePath = getMetricFilePath(metric.name, basePath);

  if (!filePath) {
    return {
      success: true, // Treat as success (skip gracefully)
      message: `Skipping unknown metric: ${metric.name}`,
    };
  }

  // Validate the metric against the strict schema
  const validationResult = HealthMetricSchema.safeParse(metric);
  if (!validationResult.success) {
    return {
      success: true, // Treat as success (skip gracefully)
      message: `Skipping unknown metric: ${metric.name}`,
    };
  }

  const validatedMetric = validationResult.data;
  const existingData = await readExistingData(filePath, reader);
  const { filteredNewMetrics, filteredExistingMetrics } = deduplicateMetrics(
    existingData.metrics,
    validatedMetric.data
  );

  if (filteredNewMetrics.length === 0) {
    return {
      success: true,
      message: `No new data for ${validatedMetric.name} (already ingested)`,
    };
  }

  // Merge with existing data (which may have been cleaned of incomplete entries)
  const mergedData: HealthDataFile = {
    metrics: [...filteredExistingMetrics, ...filteredNewMetrics],
  };

  const contentToWrite = JSON.stringify(mergedData, null, 2);
  await writer(filePath, contentToWrite);

  const incompleteReplaced = existingData.metrics.length - filteredExistingMetrics.length;
  let message = `Saved ${filteredNewMetrics.length} new entries for ${validatedMetric.name} to ${getMetricFilePath(validatedMetric.name, basePath)?.split("/").pop()}`;
  if (incompleteReplaced > 0) {
    message += ` (replaced ${incompleteReplaced} incomplete ${incompleteReplaced === 1 ? 'entry' : 'entries'})`;
  }

  return {
    success: true,
    message,
  };
}

/**
 * Main function to ingest health data from a GitHub issue
 */
export async function ingestHealthDataFromIssue(
  issue: HealthDataIssue,
  writer: WriterFunction,
  reader: ReaderFunction,
  commenter?: CommentFunction,
  basePath: string = "./vault/healthkit"
): Promise<{ success: boolean; message: string }> {
  // Step 1: Validate issue title - silently exit if not meant for us
  const titleValidation = validateIssueTitle(issue.title);
  if (!titleValidation.isValid) {
    // Issue is not meant for us, silently exit without posting anything
    return {
      success: true,
      message: "Issue not intended for this processor",
    };
  }

  // Step 2: Parse health data
  const parseResult = parseHealthData(issue.body);
  if (!parseResult.success || !parseResult.data) {
    const errorMsg = parseResult.error || "Failed to parse health data";
    if (commenter) {
      await commenter(`❌ ${errorMsg}`);
    }
    return {
      success: false,
      message: errorMsg,
    };
  }

  const healthData = parseResult.data;

  // Step 3: Process each metric
  const results: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  for (const metric of healthData.data.metrics) {
    try {
      const result = await processMetric(
        metric,
        basePath,
        writer,
        reader
      );

      if (result.success) {
        // Check if it's a skip message (unknown metrics)
        if (result.message.includes("Skipping unknown metric")) {
          skipped.push(result.message);
        } else {
          results.push(result.message);
        }
      } else {
        errors.push(result.message);
      }
    } catch (error) {
      const errorMsg = `Error processing ${metric.name}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
    }
  }

  // Step 4: Handle results and post comments
  if (errors.length > 0) {
    const errorMessage = `❌ Encountered errors while processing:\n${errors.map(e => `- ${e}`).join("\n")}`;
    if (commenter) {
      await commenter(errorMessage);
    }
    return {
      success: false,
      message: `Errors occurred: ${errors.join("; ")}`,
    };
  }

  // Build success message with results and skipped items
  const allMessages = [...results];
  if (skipped.length > 0) {
    allMessages.push(...skipped);
  }

  const successMessage = `✅ Successfully ingested health data!\n\n${allMessages.map(r => `- ${r}`).join("\n")}`;
  if (commenter) {
    await commenter(successMessage);
  }

  const messageParts = [...results];
  if (skipped.length > 0) {
    messageParts.push(...skipped);
  }

  return {
    success: true,
    message: `Successfully ingested health data:\n${messageParts.join("\n")}`,
  };
}

/**
 * Main function to ingest health data directly from a HealthDataExport object
 * This is useful for processing JSON files directly without going through GitHub issues
 */
export async function ingestHealthDataFromExport(
  healthData: HealthDataExport,
  writer: WriterFunction,
  reader: ReaderFunction,
  basePath: string = "./vault/healthkit"
): Promise<{ success: boolean; message: string }> {
  // Process each metric
  const results: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  for (const metric of healthData.data.metrics) {
    try {
      const result = await processMetric(
        metric,
        basePath,
        writer,
        reader
      );

      if (result.success) {
        // Check if it's a skip message (unknown metrics)
        if (result.message.includes("Skipping unknown metric")) {
          skipped.push(result.message);
        } else {
          results.push(result.message);
        }
      } else {
        errors.push(result.message);
      }
    } catch (error) {
      const errorMsg = `Error processing ${metric.name}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
    }
  }

  // Handle results
  if (errors.length > 0) {
    return {
      success: false,
      message: `Errors occurred: ${errors.join("; ")}`,
    };
  }

  const messageParts = [...results];
  if (skipped.length > 0) {
    messageParts.push(...skipped);
  }

  return {
    success: true,
    message: `Successfully ingested health data:\n${messageParts.join("\n")}`,
  };
}