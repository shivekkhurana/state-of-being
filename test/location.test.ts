import { expect, describe, it, beforeEach } from "bun:test";
import {
  ingestLocationDataFromIssue,
  LocationDataIssue,
  parseLocationData,
  validateLocationIssueTitle,
  readExistingLocationData,
} from "@src/location";

type WriterFunction = (path: string, content: string) => Promise<void>;
type ReaderFunction = (path: string) => Promise<string>;
type CommentFunction = (comment: string) => Promise<void>;

describe("ingestLocationDataFromIssue", () => {
  let mockWriter: WriterFunction;
  let mockReader: ReaderFunction;
  let mockCommenter: CommentFunction;
  let writtenFiles: Map<string, string>;
  let readFiles: Map<string, string>;
  let commentsPosted: string[];
  let writerCallCount: number;
  let readerCallCount: number;

  beforeEach(() => {
    writtenFiles = new Map();
    readFiles = new Map();
    commentsPosted = [];
    writerCallCount = 0;
    readerCallCount = 0;

    mockWriter = async (path: string, content: string) => {
      writerCallCount++;
      writtenFiles.set(path, content);
    };

    mockReader = async (path: string) => {
      readerCallCount++;
      const content = readFiles.get(path);
      if (!content) {
        throw new Error("File not found");
      }
      return content;
    };

    mockCommenter = async (comment: string) => {
      commentsPosted.push(comment);
    };
  });

  const sampleLocationDataIssue: LocationDataIssue = {
    title: "LocationDataExport",
    body: JSON.stringify({
      city: "New Delhi",
      country: "India",
    }),
  };

  describe("validateLocationIssueTitle", () => {
    it("should validate correct title", () => {
      const result = validateLocationIssueTitle("LocationDataExport");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject incorrect title", () => {
      const result = validateLocationIssueTitle("WrongTitle");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("LocationDataExport");
    });
  });

  describe("parseLocationData", () => {
    it("should parse valid location data", () => {
      const result = parseLocationData('{"city":"New Delhi","country":"India"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        city: "New Delhi",
        country: "India",
      });
    });

    it("should reject invalid JSON", () => {
      const result = parseLocationData("invalid json");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Error parsing location data");
    });

    it("should reject missing city field", () => {
      const result = parseLocationData('{"country":"India"}');
      expect(result.success).toBe(false);
      expect(result.error).toContain("city");
    });

    it("should reject missing country field", () => {
      const result = parseLocationData('{"city":"New Delhi"}');
      expect(result.success).toBe(false);
      expect(result.error).toContain("country");
    });

    it("should reject empty city", () => {
      const result = parseLocationData('{"city":"","country":"India"}');
      expect(result.success).toBe(true); // Empty string is valid for Zod
      expect(result.data?.city).toBe("");
    });

    it("should handle extra fields gracefully", () => {
      const result = parseLocationData('{"city":"New Delhi","country":"India","extra":"field"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        city: "New Delhi",
        country: "India",
      });
    });
  });

  describe("readExistingLocationData", () => {
    it("should return empty array when file does not exist", async () => {
      const result = await readExistingLocationData(
        "./test-vault/location.json",
        mockReader
      );
      expect(result).toEqual([]);
    });

    it("should parse existing location data", async () => {
      const existingData = [
        { date: "2025-01-01", city: "Paris", country: "France" },
        { date: "2025-01-15", city: "Lisbon", country: "Portugal" },
      ];
      readFiles.set(
        "./test-vault/location.json",
        JSON.stringify(existingData)
      );

      const result = await readExistingLocationData(
        "./test-vault/location.json",
        mockReader
      );
      expect(result).toEqual(existingData);
    });

    it("should return empty array for invalid JSON", async () => {
      readFiles.set("./test-vault/location.json", "invalid json");

      const result = await readExistingLocationData(
        "./test-vault/location.json",
        mockReader
      );
      expect(result).toEqual([]);
    });

    it("should return empty array for invalid structure", async () => {
      readFiles.set("./test-vault/location.json", '{"invalid": "structure"}');

      const result = await readExistingLocationData(
        "./test-vault/location.json",
        mockReader
      );
      expect(result).toEqual([]);
    });
  });

  describe("ingestLocationDataFromIssue - title validation", () => {
    it("should silently exit for issue with incorrect title", async () => {
      const issue: LocationDataIssue = {
        title: "WrongTitle",
        body: sampleLocationDataIssue.body,
      };

      const result = await ingestLocationDataFromIssue(
        issue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("not intended for this processor");
      expect(writerCallCount).toBe(0);
      expect(readerCallCount).toBe(0);
      expect(commentsPosted.length).toBe(0); // No comments posted
    });
  });

  describe("ingestLocationDataFromIssue - empty file (first entry)", () => {
    it("should add first location entry when file is empty", async () => {
      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully updated location");
      expect(writerCallCount).toBe(1);
      expect(readerCallCount).toBe(1);

      const writtenContent = writtenFiles.get("./test-vault/location.json");
      expect(writtenContent).toBeDefined();
      const locationData = JSON.parse(writtenContent!);
      expect(locationData).toHaveLength(1);
      expect(locationData[0].city).toBe("New Delhi");
      expect(locationData[0].country).toBe("India");
      expect(locationData[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Date format

      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("✅");
      expect(commentsPosted[0]).toContain("New Delhi");
      expect(commentsPosted[0]).toContain("India");
    });
  });

  describe("ingestLocationDataFromIssue - different city", () => {
    it("should add new entry when city is different from last entry", async () => {
      const existingData = [
        { date: "2025-01-01", city: "Paris", country: "France" },
        { date: "2025-01-15", city: "Lisbon", country: "Portugal" },
      ];
      readFiles.set(
        "./test-vault/location.json",
        JSON.stringify(existingData)
      );

      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully updated location");
      expect(writerCallCount).toBe(1);

      const writtenContent = writtenFiles.get("./test-vault/location.json");
      expect(writtenContent).toBeDefined();
      const locationData = JSON.parse(writtenContent!);
      expect(locationData).toHaveLength(3); // 2 existing + 1 new
      expect(locationData[0]).toEqual(existingData[0]);
      expect(locationData[1]).toEqual(existingData[1]);
      expect(locationData[2].city).toBe("New Delhi");
      expect(locationData[2].country).toBe("India");
      expect(locationData[2].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("✅");
    });

    it("should handle case-sensitive city comparison", async () => {
      const existingData = [
        { date: "2025-01-01", city: "new delhi", country: "India" },
      ];
      readFiles.set(
        "./test-vault/location.json",
        JSON.stringify(existingData)
      );

      // "new delhi" != "New Delhi" (case-sensitive)
      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully updated location");
      expect(writerCallCount).toBe(1);

      const writtenContent = writtenFiles.get("./test-vault/location.json");
      const locationData = JSON.parse(writtenContent!);
      expect(locationData).toHaveLength(2); // Should add new entry
    });
  });

  describe("ingestLocationDataFromIssue - same city", () => {
    it("should skip update when city is the same as last entry", async () => {
      const existingData = [
        { date: "2025-01-01", city: "Paris", country: "France" },
        { date: "2025-01-15", city: "New Delhi", country: "India" },
      ];
      readFiles.set(
        "./test-vault/location.json",
        JSON.stringify(existingData)
      );

      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Location not updated");
      expect(result.message).toContain("same as the last entry");
      expect(writerCallCount).toBe(0); // Should not write
      expect(readerCallCount).toBe(1); // Should read to check

      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("ℹ️");
      expect(commentsPosted[0]).toContain("same as the last entry");
    });

    it("should skip update even if country is different but city is same", async () => {
      const existingData = [
        { date: "2025-01-01", city: "New Delhi", country: "India" },
      ];
      readFiles.set(
        "./test-vault/location.json",
        JSON.stringify(existingData)
      );

      // Same city, different country (edge case)
      const issue: LocationDataIssue = {
        title: "LocationDataExport",
        body: JSON.stringify({
          city: "New Delhi",
          country: "Bharat", // Different country
        }),
      };

      const result = await ingestLocationDataFromIssue(
        issue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Location not updated");
      expect(writerCallCount).toBe(0); // Should not write
    });
  });

  describe("ingestLocationDataFromIssue - error handling", () => {
    it("should handle invalid JSON in issue body", async () => {
      const issue: LocationDataIssue = {
        title: "LocationDataExport",
        body: "invalid json",
      };

      const result = await ingestLocationDataFromIssue(
        issue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Error parsing location data");
      expect(writerCallCount).toBe(0);
      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("❌");
    });

    it("should handle missing city field", async () => {
      const issue: LocationDataIssue = {
        title: "LocationDataExport",
        body: JSON.stringify({ country: "India" }),
      };

      const result = await ingestLocationDataFromIssue(
        issue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("city");
      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("❌");
    });

    it("should handle missing country field", async () => {
      const issue: LocationDataIssue = {
        title: "LocationDataExport",
        body: JSON.stringify({ city: "New Delhi" }),
      };

      const result = await ingestLocationDataFromIssue(
        issue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("country");
      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("❌");
    });
  });

  describe("ingestLocationDataFromIssue - multiple entries", () => {
    it("should handle multiple different cities in sequence", async () => {
      // First entry
      const result1 = await ingestLocationDataFromIssue(
        {
          title: "LocationDataExport",
          body: JSON.stringify({ city: "Paris", country: "France" }),
        },
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result1.success).toBe(true);
      expect(writerCallCount).toBe(1);

      // Set up reader with first entry
      const firstContent = writtenFiles.get("./test-vault/location.json");
      if (firstContent) {
        readFiles.set("./test-vault/location.json", firstContent);
      }

      // Second entry - different city
      const result2 = await ingestLocationDataFromIssue(
        {
          title: "LocationDataExport",
          body: JSON.stringify({ city: "Lisbon", country: "Portugal" }),
        },
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result2.success).toBe(true);
      expect(writerCallCount).toBe(2);

      const secondContent = writtenFiles.get("./test-vault/location.json");
      const locationData = JSON.parse(secondContent!);
      expect(locationData).toHaveLength(2);
      expect(locationData[0].city).toBe("Paris");
      expect(locationData[1].city).toBe("Lisbon");

      // Set up reader with second entry
      if (secondContent) {
        readFiles.set("./test-vault/location.json", secondContent);
      }

      // Third entry - same as last, should skip
      const result3 = await ingestLocationDataFromIssue(
        {
          title: "LocationDataExport",
          body: JSON.stringify({ city: "Lisbon", country: "Portugal" }),
        },
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result3.success).toBe(true);
      expect(result3.message).toContain("not updated");
      expect(writerCallCount).toBe(2); // Still 2, not incremented
    });
  });

  describe("ingestLocationDataFromIssue - date handling", () => {
    it("should use current date for new entries", async () => {
      const beforeDate = new Date().toISOString().split("T")[0];

      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);

      const writtenContent = writtenFiles.get("./test-vault/location.json");
      const locationData = JSON.parse(writtenContent!);
      const entryDate = locationData[0].date;
      
      // Date should be in YYYY-MM-DD format
      expect(entryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Date should be today (allowing for timezone differences)
      const afterDate = new Date().toISOString().split("T")[0];
      expect(entryDate).toBe(afterDate); // Should match current date
    });
  });

  describe("ingestLocationDataFromIssue - commenter behavior", () => {
    it("should not call commenter when it is not provided", async () => {
      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        undefined, // No commenter
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(commentsPosted.length).toBe(0);
    });

    it("should call commenter on success", async () => {
      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("✅");
    });

    it("should call commenter on error", async () => {
      const issue: LocationDataIssue = {
        title: "LocationDataExport",
        body: "invalid json",
      };

      const result = await ingestLocationDataFromIssue(
        issue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(false);
      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("❌");
    });

    it("should call commenter when city is same (informational)", async () => {
      const existingData = [
        { date: "2025-01-15", city: "New Delhi", country: "India" },
      ];
      readFiles.set(
        "./test-vault/location.json",
        JSON.stringify(existingData)
      );

      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      expect(commentsPosted.length).toBe(1);
      expect(commentsPosted[0]).toContain("ℹ️");
    });
  });

  describe("ingestLocationDataFromIssue - edge cases", () => {
    it("should handle empty city string", async () => {
      const issue: LocationDataIssue = {
        title: "LocationDataExport",
        body: JSON.stringify({ city: "", country: "India" }),
      };

      // Empty string is technically valid but should be handled
      const result = await ingestLocationDataFromIssue(
        issue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      // Should succeed and add entry (empty string != any existing city)
      expect(result.success).toBe(true);
      expect(writerCallCount).toBe(1);
    });

    it("should handle location.json with single entry", async () => {
      const existingData = [
        { date: "2025-01-15", city: "Paris", country: "France" },
      ];
      readFiles.set(
        "./test-vault/location.json",
        JSON.stringify(existingData)
      );

      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      const writtenContent = writtenFiles.get("./test-vault/location.json");
      const locationData = JSON.parse(writtenContent!);
      expect(locationData).toHaveLength(2);
    });

    it("should preserve existing entries when adding new one", async () => {
      const existingData = [
        { date: "2025-01-01", city: "Paris", country: "France" },
        { date: "2025-01-15", city: "Lisbon", country: "Portugal" },
        { date: "2025-02-01", city: "Berlin", country: "Germany" },
      ];
      readFiles.set(
        "./test-vault/location.json",
        JSON.stringify(existingData)
      );

      const result = await ingestLocationDataFromIssue(
        sampleLocationDataIssue,
        mockWriter,
        mockReader,
        mockCommenter,
        "./test-vault/location.json"
      );

      expect(result.success).toBe(true);
      const writtenContent = writtenFiles.get("./test-vault/location.json");
      const locationData = JSON.parse(writtenContent!);
      expect(locationData).toHaveLength(4);
      expect(locationData[0]).toEqual(existingData[0]);
      expect(locationData[1]).toEqual(existingData[1]);
      expect(locationData[2]).toEqual(existingData[2]);
      expect(locationData[3].city).toBe("New Delhi");
    });
  });
});

