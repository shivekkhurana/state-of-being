import { z, ZodError } from "zod";
import { getCurrentDate } from "@src/time";

type WriterFunction = (path: string, content: string) => Promise<void>;
type ReaderFunction = (path: string) => Promise<string>;
type CommentFunction = (comment: string) => Promise<void>;

// Zod schema for location data
const LocationDataSchema = z.object({
  city: z.string(),
  country: z.string(),
});

const LocationEntrySchema = z.object({
  date: z.string(),
  city: z.string(),
  country: z.string(),
});

const LocationDataFileSchema = z.array(LocationEntrySchema);

const LocationDataIssueSchema = z.object({
  title: z.string(),
  body: z.string(),
  createdAt: z.string().optional(),
});

// Inferred TypeScript types from Zod schemas
export type LocationDataIssue = z.infer<typeof LocationDataIssueSchema>;
export type LocationData = z.infer<typeof LocationDataSchema>;
export type LocationEntry = z.infer<typeof LocationEntrySchema>;
export type LocationDataFile = z.infer<typeof LocationDataFileSchema>;

const EXPECTED_ISSUE_TITLE = "LocationDataExport";

/**
 * Validates that the issue title matches the expected format
 */
export function validateLocationIssueTitle(title: string): {
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
 * Parses and validates the location data JSON from issue body using Zod
 */
export function parseLocationData(body: string): {
  success: boolean;
  data?: LocationData;
  error?: string;
} {
  try {
    const parsedJson = JSON.parse(body);
    const validationResult = LocationDataSchema.safeParse(parsedJson);

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
      error: `Error parsing location data: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Reads existing location data from file, or returns empty array if file doesn't exist
 * Validates data using Zod schema
 */
export async function readExistingLocationData(
  filePath: string,
  reader: ReaderFunction
): Promise<LocationDataFile> {
  try {
    const existingContent = await reader(filePath);
    const parsedJson = JSON.parse(existingContent);
    
    // Validate with Zod schema
    const validationResult = LocationDataFileSchema.safeParse(parsedJson);
    
    if (!validationResult.success) {
      // If validation fails, return empty array to start fresh
      const error: ZodError = validationResult.error;
      console.warn(
        `Validation failed for ${filePath}: ${error.issues
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join("; ")}`
      );
      return [];
    }

    return validationResult.data;
  } catch (error) {
    // File doesn't exist or is empty, start fresh
    return [];
  }
}

/**
 * Gets the last location entry from the location data file
 */
function getLastLocationEntry(locationData: LocationDataFile): LocationEntry | null {
  if (locationData.length === 0) {
    return null;
  }
  return locationData[locationData.length - 1];
}

/**
 * Main function to ingest location data from a GitHub issue
 */
export async function ingestLocationDataFromIssue(
  issue: LocationDataIssue,
  writer: WriterFunction,
  reader: ReaderFunction,
  commenter?: CommentFunction,
  filePath: string = "./vault/location.json"
): Promise<{ success: boolean; message: string }> {
  // Step 1: Validate issue title - silently exit if not meant for us
  const titleValidation = validateLocationIssueTitle(issue.title);
  if (!titleValidation.isValid) {
    // Issue is not meant for us, silently exit without posting anything
    return {
      success: true,
      message: "Issue not intended for this processor",
    };
  }

  // Step 2: Parse location data
  const parseResult = parseLocationData(issue.body);
  if (!parseResult.success || !parseResult.data) {
    const errorMsg = parseResult.error || "Failed to parse location data";
    if (commenter) {
      await commenter(`❌ ${errorMsg}`);
    }
    return {
      success: false,
      message: errorMsg,
    };
  }

  const locationData = parseResult.data;

  // Step 3: Read existing location data
  const existingLocations = await readExistingLocationData(filePath, reader);
  const lastEntry = getLastLocationEntry(existingLocations);

  // Step 4: Check if the city is the same as the last entry
  if (lastEntry && lastEntry.city === locationData.city) {
    const message = `Location not updated: ${locationData.city}, ${locationData.country} is the same as the last entry`;
    if (commenter) {
      await commenter(`ℹ️ ${message}`);
    }
    return {
      success: true,
      message,
    };
  }

  // Step 5: City is different, add new entry with current date
  const currentDate = getCurrentDate();
  const newEntry: LocationEntry = {
    date: currentDate,
    city: locationData.city,
    country: locationData.country,
  };

  const updatedLocations = [...existingLocations, newEntry];
  const contentToWrite = JSON.stringify(updatedLocations, null, 2);
  
  console.log(`Writing to: ${filePath}`);
  console.log(`Current entries: ${existingLocations.length}, New entry: ${JSON.stringify(newEntry)}`);
  console.log(`Total entries after add: ${updatedLocations.length}`);
  
  await writer(filePath, contentToWrite);

  const successMessage = `✅ Successfully updated location!\n\nAdded: ${locationData.city}, ${locationData.country} (${currentDate})`;
  if (commenter) {
    await commenter(successMessage);
  }

  return {
    success: true,
    message: successMessage,
  };
}

