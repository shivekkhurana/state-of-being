import { expect, describe, it, beforeEach } from "bun:test";
import {
  ingestHealthDataFromIssue,
  HealthDataIssue,
} from "@src/healthkit";

type WriterFunction = (path: string, content: string) => Promise<void>;
type ReaderFunction = (path: string) => Promise<string>;
type CommentFunction = (comment: string) => Promise<void>;

describe("ingestHealthDataFromIssue", () => {
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

  const sampleHealthDataIssue: HealthDataIssue = {
    title: "HealthDataExport",
    body: JSON.stringify({
      data: {
        metrics: [
          {
            name: "heart_rate",
            units: "count/min",
            data: [
              {
                Max: 96,
                Avg: 66.072727272727235,
                Min: 51,
                source: "Ultrahuman",
                date: "2025-10-27 00:00:00 +0530",
              },
              {
                Max: 78,
                source: "Ultrahuman",
                Min: 56,
                Avg: 61.547008547008474,
                date: "2025-10-28 00:00:00 +0530",
              },
            ],
          },
          {
            name: "heart_rate_variability",
            units: "ms",
            data: [
              {
                qty: 89.25,
                date: "2025-10-27 00:00:00 +0530",
              },
              {
                qty: 96.253012048192772,
                date: "2025-10-28 00:00:00 +0530",
              },
            ],
          },
          {
            name: "body_temperature",
            units: "degC",
            data: [
              {
                date: "2025-10-27 00:00:00 +0530",
                qty: 34.854140403053975,
              },
              {
                date: "2025-10-28 00:00:00 +0530",
                qty: 35.066676082774109,
              },
            ],
          },
          {
            name: "sleep_analysis",
            units: "hr",
            data: [
              {
                inBedStart: "2025-10-26 22:00:00 +0530",
                awake: 0.25,
                source: "Ultrahuman",
                sleepStart: "2025-10-26 22:00:00 +0530",
                totalSleep: 4.6666666666666661,
                sleepEnd: "2025-10-27 02:55:00 +0530",
                date: "2025-10-27 00:00:00 +0530",
                deep: 1.25,
                rem: 1.3333333333333333,
                inBedEnd: "2025-10-27 02:55:00 +0530",
                inBed: 0,
                core: 2.083333333333333,
                asleep: 0,
              },
            ],
          },
        ],
      },
    }),
  };

  it("should silently exit for issue with incorrect title", async () => {
    const issue: HealthDataIssue = {
      title: "WrongTitle",
      body: sampleHealthDataIssue.body,
    };

    const result = await ingestHealthDataFromIssue(
      issue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("not intended for this processor");
    expect(writerCallCount).toBe(0);
    expect(commentsPosted.length).toBe(0); // No comments posted
  });

  it("should successfully ingest health data for all metrics", async () => {
    const result = await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("Successfully ingested health data");

    // Verify all files were written
    expect(writtenFiles.has("./test-vault/healthkit/hr.json")).toBe(true);
    expect(writtenFiles.has("./test-vault/healthkit/hrv.json")).toBe(true);
    expect(writtenFiles.has("./test-vault/healthkit/bodySurfaceTemp.json")).toBe(
      true
    );
    expect(writtenFiles.has("./test-vault/healthkit/sleep.json")).toBe(true);

    // Verify heart_rate data
    const hrContent = writtenFiles.get("./test-vault/healthkit/hr.json");
    expect(hrContent).toBeDefined();
    const hrData = JSON.parse(hrContent!);
    expect(hrData.metrics).toHaveLength(2);
    expect(hrData.metrics[0].date).toBe("2025-10-27 00:00:00 +0530");

    // Verify heart_rate_variability data
    const hrvContent = writtenFiles.get("./test-vault/healthkit/hrv.json");
    expect(hrvContent).toBeDefined();
    const hrvData = JSON.parse(hrvContent!);
    expect(hrvData.metrics).toHaveLength(2);
    expect(hrvData.metrics[0].qty).toBe(89.25);

    // Verify body_temperature data
    const tempContent = writtenFiles.get(
      "./test-vault/healthkit/bodySurfaceTemp.json"
    );
    expect(tempContent).toBeDefined();
    const tempData = JSON.parse(tempContent!);
    expect(tempData.metrics).toHaveLength(2);
    expect(tempData.metrics[0].qty).toBe(34.854140403053975);

    // Verify sleep_analysis data
    const sleepContent = writtenFiles.get("./test-vault/healthkit/sleep.json");
    expect(sleepContent).toBeDefined();
    const sleepData = JSON.parse(sleepContent!);
    expect(sleepData.metrics).toHaveLength(1);
    expect(sleepData.metrics[0].totalSleep).toBe(4.6666666666666661);

    // Verify success comment was posted
    expect(commentsPosted.length).toBe(1);
    expect(commentsPosted[0]).toContain("✅");
  });

  it("should save issue creation timestamp in data", async () => {
    const issueWithTimestamp: HealthDataIssue = {
      ...sampleHealthDataIssue,
      createdAt: "2025-10-27T10:00:00Z",
    };

    await ingestHealthDataFromIssue(
      issueWithTimestamp,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    // Verify timestamp is saved in all files
    const hrContent = writtenFiles.get("./test-vault/healthkit/hr.json");
    const hrData = JSON.parse(hrContent!);
    expect(hrData.issueCreatedAt).toBe("2025-10-27T10:00:00Z");

    const hrvContent = writtenFiles.get("./test-vault/healthkit/hrv.json");
    const hrvData = JSON.parse(hrvContent!);
    expect(hrvData.issueCreatedAt).toBe("2025-10-27T10:00:00Z");
  });

  it("should be idempotent - not duplicate data when called twice", async () => {
    // First ingestion
    await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    // Read the files that were written
    const hrFirstContent = writtenFiles.get("./test-vault/healthkit/hr.json");
    readFiles.set("./test-vault/healthkit/hr.json", hrFirstContent!);

    // Second ingestion with same data
    await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    // Verify heart_rate data wasn't duplicated
    const hrContent = writtenFiles.get("./test-vault/healthkit/hr.json");
    const hrData = JSON.parse(hrContent!);
    expect(hrData.metrics).toHaveLength(2); // Still 2, not 4

    // Verify the message indicates no new data
    const result = await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );
    expect(result.message).toContain("No new data");
  });

  it("should merge new data with existing data", async () => {
    // Set up existing data
    const existingHrData = {
      metrics: [
        {
          Max: 90,
          Avg: 65,
          Min: 50,
          source: "Ultrahuman",
          date: "2025-10-26 00:00:00 +0530",
        },
      ],
    };
    readFiles.set(
      "./test-vault/healthkit/hr.json",
      JSON.stringify(existingHrData)
    );

    // Ingest new data
    await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    // Verify merged data
    const hrContent = writtenFiles.get("./test-vault/healthkit/hr.json");
    const hrData = JSON.parse(hrContent!);
    expect(hrData.metrics).toHaveLength(3); // 1 existing + 2 new
    expect(hrData.metrics[0].date).toBe("2025-10-26 00:00:00 +0530");
    expect(hrData.metrics[1].date).toBe("2025-10-27 00:00:00 +0530");
    expect(hrData.metrics[2].date).toBe("2025-10-28 00:00:00 +0530");
  });

  it("should handle invalid JSON in issue body", async () => {
    const issue: HealthDataIssue = {
      title: "HealthDataExport",
      body: "invalid json",
    };

    const result = await ingestHealthDataFromIssue(
      issue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Error parsing health data");
    expect(commentsPosted.length).toBe(1);
    expect(commentsPosted[0]).toContain("❌");
  });

  it("should handle missing data.metrics array", async () => {
    const issue: HealthDataIssue = {
      title: "HealthDataExport",
      body: JSON.stringify({ data: {} }),
    };

    const result = await ingestHealthDataFromIssue(
      issue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("data.metrics");
    expect(commentsPosted.length).toBe(1);
    expect(commentsPosted[0]).toContain("❌");
  });

  it("should skip unknown metrics", async () => {
    const issue: HealthDataIssue = {
      title: "HealthDataExport",
      body: JSON.stringify({
        data: {
          metrics: [
            {
              name: "unknown_metric",
              units: "unit",
              data: [{ value: 1 }],
            },
            {
              name: "heart_rate",
              units: "count/min",
              data: [
                {
                  Max: 96,
                  Avg: 66,
                  Min: 51,
                  date: "2025-10-27 00:00:00 +0530",
                },
              ],
            },
          ],
        },
      }),
    };

    const result = await ingestHealthDataFromIssue(
      issue,
      mockWriter,
      mockReader,
      mockCommenter,
      "./test-vault/healthkit"
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("Skipping unknown metric: unknown_metric");
    // Should still write heart_rate
    expect(writtenFiles.has("./test-vault/healthkit/hr.json")).toBe(true);
  });
});
