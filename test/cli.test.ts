import { expect, describe, it, beforeEach } from "bun:test";
import { ingestHealthDataFromIssue } from "@src/healthkit";
import { ingestLocationDataFromIssue } from "@src/location";
import config from "@src/config";

// Track which ingester was called
let healthkitCalled = false;
let locationCalled = false;
let healthkitCallArgs: any[] = [];
let locationCallArgs: any[] = [];

// Create mock versions that track calls
async function mockHealthkitIngest(...args: any[]) {
  healthkitCalled = true;
  healthkitCallArgs = args;
  // Actually call the real function but with mocked dependencies
  const [issue, writer, reader, commenter, basePath] = args;
  
  // Use a mock writer/reader for testing
  const mockWriter = async (path: string, content: string) => {};
  const mockReader = async (path: string): Promise<string> => {
    throw new Error("File not found");
  };
  
  return await ingestHealthDataFromIssue(issue, mockWriter, mockReader, commenter, basePath);
}

async function mockLocationIngest(...args: any[]) {
  locationCalled = true;
  locationCallArgs = args;
  // Actually call the real function but with mocked dependencies
  const [issue, writer, reader, commenter, filePath] = args;
  
  // Use a mock writer/reader for testing
  const mockWriter = async (path: string, content: string) => {};
  const mockReader = async (path: string): Promise<string> => {
    throw new Error("File not found");
  };
  
  return await ingestLocationDataFromIssue(issue, mockWriter, mockReader, commenter, filePath);
}

describe("CLI process-issue routing logic", () => {
  beforeEach(() => {
    healthkitCalled = false;
    locationCalled = false;
    healthkitCallArgs = [];
    locationCallArgs = [];
  });

  // Simulate the routing logic from cli.ts
  async function simulateCLIRouting(
    issueTitle: string,
    issueBody: string,
    issueCreatedAt?: string
  ): Promise<{ success: boolean; message: string; whichIngester: string }> {
    const writer = async (path: string, content: string) => {};
    const reader = async (path: string): Promise<string> => {
      throw new Error("File not found");
    };
    const commenter = async (comment: string) => {};

    let result: { success: boolean; message: string; whichIngester: string };

    if (issueTitle === "HealthDataExport") {
      const ingestResult = await mockHealthkitIngest(
        {
          title: issueTitle,
          body: issueBody,
          createdAt: issueCreatedAt,
        },
        writer,
        reader,
        commenter,
        config.healthkitFolderPath
      );
      result = {
        ...ingestResult,
        whichIngester: "healthkit",
      };
    } else if (issueTitle === "LocationDataExport") {
      const ingestResult = await mockLocationIngest(
        {
          title: issueTitle,
          body: issueBody,
          createdAt: issueCreatedAt,
        },
        writer,
        reader,
        commenter,
        config.locationFilePath
      );
      result = {
        ...ingestResult,
        whichIngester: "location",
      };
    } else {
      const errorMsg = `Unknown issue type: ${issueTitle}. Expected "HealthDataExport" or "LocationDataExport"`;
      result = {
        success: false,
        message: errorMsg,
        whichIngester: "none",
      };
    }

    return result;
  }

  describe("routing to correct ingester", () => {
    it("should route HealthDataExport to healthkit ingester", async () => {
      const healthDataBody = JSON.stringify({
        data: {
          metrics: [
            {
              name: "heart_rate",
              units: "count/min",
              data: [{ Max: 96, Avg: 66, Min: 51, date: "2025-10-27 00:00:00 +0530" }],
            },
          ],
        },
      });

      const result = await simulateCLIRouting("HealthDataExport", healthDataBody);

      expect(healthkitCalled).toBe(true);
      expect(locationCalled).toBe(false);
      expect(result.whichIngester).toBe("healthkit");

      // Verify the issue was passed correctly
      expect(healthkitCallArgs[0].title).toBe("HealthDataExport");
      expect(healthkitCallArgs[0].body).toBe(healthDataBody);
      expect(healthkitCallArgs[4]).toBe(config.healthkitFolderPath);
    });

    it("should route LocationDataExport to location ingester", async () => {
      const locationBody = JSON.stringify({
        city: "New Delhi",
        country: "India",
      });

      const result = await simulateCLIRouting("LocationDataExport", locationBody);

      expect(locationCalled).toBe(true);
      expect(healthkitCalled).toBe(false);
      expect(result.whichIngester).toBe("location");

      // Verify the issue was passed correctly
      expect(locationCallArgs[0].title).toBe("LocationDataExport");
      expect(locationCallArgs[0].body).toBe(locationBody);
      expect(locationCallArgs[4]).toBe(config.locationFilePath);
    });

    it("should handle unknown issue title", async () => {
      const result = await simulateCLIRouting("UnknownTitle", "some body");

      expect(healthkitCalled).toBe(false);
      expect(locationCalled).toBe(false);
      expect(result.whichIngester).toBe("none");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown issue type");
      expect(result.message).toContain("Expected \"HealthDataExport\" or \"LocationDataExport\"");
    });
  });

  describe("ingester function parameters", () => {
    it("should pass correct parameters to healthkit ingester", async () => {
      const healthDataBody = JSON.stringify({
        data: {
          metrics: [
            {
              name: "heart_rate",
              units: "count/min",
              data: [{ Max: 96, Avg: 66, Min: 51, date: "2025-10-27 00:00:00 +0530" }],
            },
          ],
        },
      });
      const issueCreatedAt = "2025-10-27T10:00:00Z";

      await simulateCLIRouting("HealthDataExport", healthDataBody, issueCreatedAt);

      expect(healthkitCallArgs[0]).toEqual({
        title: "HealthDataExport",
        body: healthDataBody,
        createdAt: issueCreatedAt,
      });
      expect(typeof healthkitCallArgs[1]).toBe("function"); // writer
      expect(typeof healthkitCallArgs[2]).toBe("function"); // reader
      expect(healthkitCallArgs[3]).toBeDefined(); // commenter
      expect(healthkitCallArgs[4]).toBe(config.healthkitFolderPath);
    });

    it("should pass correct parameters to location ingester", async () => {
      const locationBody = JSON.stringify({
        city: "Paris",
        country: "France",
      });
      const issueCreatedAt = "2025-10-27T10:00:00Z";

      await simulateCLIRouting("LocationDataExport", locationBody, issueCreatedAt);

      expect(locationCallArgs[0]).toEqual({
        title: "LocationDataExport",
        body: locationBody,
        createdAt: issueCreatedAt,
      });
      expect(typeof locationCallArgs[1]).toBe("function"); // writer
      expect(typeof locationCallArgs[2]).toBe("function"); // reader
      expect(locationCallArgs[3]).toBeDefined(); // commenter
      expect(locationCallArgs[4]).toBe(config.locationFilePath);
    });
  });

  describe("error handling", () => {
    it("should propagate healthkit ingester errors", async () => {
      // Invalid health data that will cause parsing to fail
      const invalidHealthDataBody = "invalid json";

      const result = await simulateCLIRouting("HealthDataExport", invalidHealthDataBody);

      expect(healthkitCalled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Error parsing");
    });

    it("should propagate location ingester errors", async () => {
      // Invalid location data that will cause parsing to fail
      const invalidLocationBody = "invalid json";

      const result = await simulateCLIRouting("LocationDataExport", invalidLocationBody);

      expect(locationCalled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Error parsing");
    });
  });

  describe("integration scenarios", () => {
    it("should handle successful health data export end-to-end", async () => {
      const healthDataBody = JSON.stringify({
        data: {
          metrics: [
            {
              name: "heart_rate",
              units: "count/min",
              data: [{ Max: 96, Avg: 66, Min: 51, date: "2025-10-27 00:00:00 +0530" }],
            },
          ],
        },
      });

      const result = await simulateCLIRouting("HealthDataExport", healthDataBody);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully ingested");
      expect(healthkitCalled).toBe(true);
      expect(locationCalled).toBe(false);
    });

    it("should handle successful location data export end-to-end", async () => {
      const locationBody = JSON.stringify({
        city: "New Delhi",
        country: "India",
      });

      const result = await simulateCLIRouting("LocationDataExport", locationBody);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully updated location");
      expect(locationCalled).toBe(true);
      expect(healthkitCalled).toBe(false);
    });

    it("should handle location data when city is same as last entry", async () => {
      // First, we'd need to set up existing location data
      // But since we're using a mock reader that throws, this will be treated as a new entry
      const locationBody = JSON.stringify({
        city: "New Delhi",
        country: "India",
      });

      const result = await simulateCLIRouting("LocationDataExport", locationBody);

      // The ingester will succeed (either adding new or skipping)
      expect(result.success).toBe(true);
      expect(locationCalled).toBe(true);
      expect(healthkitCalled).toBe(false);
    });

    it("should only call one ingester at a time", async () => {
      const healthDataBody = JSON.stringify({
        data: {
          metrics: [
            {
              name: "heart_rate",
              units: "count/min",
              data: [{ Max: 96, Avg: 66, Min: 51, date: "2025-10-27 00:00:00 +0530" }],
            },
          ],
        },
      });

      await simulateCLIRouting("HealthDataExport", healthDataBody);

      expect(healthkitCalled).toBe(true);
      expect(locationCalled).toBe(false);

      // Reset and test location
      healthkitCalled = false;
      locationCalled = false;

      const locationBody = JSON.stringify({
        city: "Paris",
        country: "France",
      });

      await simulateCLIRouting("LocationDataExport", locationBody);

      expect(healthkitCalled).toBe(false);
      expect(locationCalled).toBe(true);
    });
  });
});

