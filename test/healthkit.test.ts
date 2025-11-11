import { expect, describe, it, beforeEach } from 'bun:test';
import { ingestHealthDataFromIssue, HealthDataIssue } from '@src/healthkit';

type WriterFunction = (path: string, content: string) => Promise<void>;
type ReaderFunction = (path: string) => Promise<string>;
type CommentFunction = (comment: string) => Promise<void>;

describe('ingestHealthDataFromIssue', () => {
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
        throw new Error('File not found');
      }
      return content;
    };

    mockCommenter = async (comment: string) => {
      commentsPosted.push(comment);
    };
  });

  const sampleHealthDataIssue: HealthDataIssue = {
    title: 'HealthDataExport',
    body: JSON.stringify({
      data: {
        metrics: [
          {
            name: 'heart_rate',
            units: 'count/min',
            data: [
              {
                Max: 96,
                Avg: 66.072727272727235,
                Min: 51,
                source: 'Ultrahuman',
                date: '2025-10-27 00:00:00 +0530',
              },
              {
                Max: 78,
                source: 'Ultrahuman',
                Min: 56,
                Avg: 61.547008547008474,
                date: '2025-10-28 00:00:00 +0530',
              },
            ],
          },
          {
            name: 'heart_rate_variability',
            units: 'ms',
            data: [
              {
                qty: 89.25,
                date: '2025-10-27 00:00:00 +0530',
              },
              {
                qty: 96.253012048192772,
                date: '2025-10-28 00:00:00 +0530',
              },
            ],
          },
          {
            name: 'body_temperature',
            units: 'degC',
            data: [
              {
                date: '2025-10-27 00:00:00 +0530',
                qty: 34.854140403053975,
              },
              {
                date: '2025-10-28 00:00:00 +0530',
                qty: 35.066676082774109,
              },
            ],
          },
          {
            name: 'sleep_analysis',
            units: 'hr',
            data: [
              {
                inBedStart: '2025-10-26 22:00:00 +0530',
                awake: 0.25,
                source: 'Ultrahuman',
                sleepStart: '2025-10-26 22:00:00 +0530',
                totalSleep: 4.6666666666666661,
                sleepEnd: '2025-10-27 02:55:00 +0530',
                date: '2025-10-27 00:00:00 +0530',
                deep: 1.25,
                rem: 1.3333333333333333,
                inBedEnd: '2025-10-27 02:55:00 +0530',
                inBed: 0,
                core: 2.083333333333333,
                asleep: 0,
              },
            ],
          },
          {
            name: 'resting_heart_rate',
            units: 'count/min',
            data: [
              {
                qty: 52,
                date: '2025-10-27 00:00:00 +0530',
              },
              {
                qty: 56,
                date: '2025-10-28 00:00:00 +0530',
              },
            ],
          },
        ],
      },
    }),
  };

  it('should silently exit for issue with incorrect title', async () => {
    const issue: HealthDataIssue = {
      title: 'WrongTitle',
      body: sampleHealthDataIssue.body,
    };

    const result = await ingestHealthDataFromIssue(
      issue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('not intended for this processor');
    expect(writerCallCount).toBe(0);
    expect(commentsPosted.length).toBe(0); // No comments posted
  });

  it('should successfully ingest health data for all metrics', async () => {
    const result = await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully ingested health data');

    // Verify all files were written
    expect(writtenFiles.has('./test-vault/healthkit/hr.json')).toBe(true);
    expect(writtenFiles.has('./test-vault/healthkit/hrv.json')).toBe(true);
    expect(
      writtenFiles.has('./test-vault/healthkit/bodySurfaceTemp.json')
    ).toBe(true);
    expect(writtenFiles.has('./test-vault/healthkit/sleep.json')).toBe(true);
    expect(
      writtenFiles.has('./test-vault/healthkit/restingHeartRate.json')
    ).toBe(true);

    // Verify heart_rate data
    const hrContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    expect(hrContent).toBeDefined();
    const hrData = JSON.parse(hrContent!);
    expect(hrData.metrics).toHaveLength(2);
    expect(hrData.metrics[0].date).toBe('2025-10-27 00:00:00 +0530');

    // Verify heart_rate_variability data
    const hrvContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    expect(hrvContent).toBeDefined();
    const hrvData = JSON.parse(hrvContent!);
    expect(hrvData.metrics).toHaveLength(2);
    expect(hrvData.metrics[0].qty).toBe(89.25);

    // Verify body_temperature data
    const tempContent = writtenFiles.get(
      './test-vault/healthkit/bodySurfaceTemp.json'
    );
    expect(tempContent).toBeDefined();
    const tempData = JSON.parse(tempContent!);
    expect(tempData.metrics).toHaveLength(2);
    expect(tempData.metrics[0].qty).toBe(34.854140403053975);

    // Verify sleep_analysis data
    const sleepContent = writtenFiles.get('./test-vault/healthkit/sleep.json');
    expect(sleepContent).toBeDefined();
    const sleepData = JSON.parse(sleepContent!);
    expect(sleepData.metrics).toHaveLength(1);
    expect(sleepData.metrics[0].totalSleep).toBe(4.6666666666666661);

    // Verify resting_heart_rate data
    const rhrContent = writtenFiles.get(
      './test-vault/healthkit/restingHeartRate.json'
    );
    expect(rhrContent).toBeDefined();
    const rhrData = JSON.parse(rhrContent!);
    expect(rhrData.metrics).toHaveLength(2);
    expect(rhrData.metrics[0].qty).toBe(52);
    expect(rhrData.metrics[0].date).toBe('2025-10-27 00:00:00 +0530');

    // Verify success comment was posted
    expect(commentsPosted.length).toBe(1);
    expect(commentsPosted[0]).toContain('✅');
  });

  it('should not save issue creation timestamp in data', async () => {
    const issueWithTimestamp: HealthDataIssue = {
      ...sampleHealthDataIssue,
      createdAt: '2025-10-27T10:00:00Z',
    };

    await ingestHealthDataFromIssue(
      issueWithTimestamp,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Verify timestamp is NOT saved in files (each data point has its own date)
    const hrContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    const hrData = JSON.parse(hrContent!);
    expect(hrData.issueCreatedAt).toBeUndefined();

    const hrvContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    const hrvData = JSON.parse(hrvContent!);
    expect(hrvData.issueCreatedAt).toBeUndefined();
  });

  it('should be idempotent - not duplicate data when called twice', async () => {
    // First ingestion
    await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Read all the files that were written and set them up in the mock reader
    const hrFirstContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    const hrvFirstContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    const tempFirstContent = writtenFiles.get(
      './test-vault/healthkit/bodySurfaceTemp.json'
    );
    const sleepFirstContent = writtenFiles.get(
      './test-vault/healthkit/sleep.json'
    );
    const rhrFirstContent = writtenFiles.get(
      './test-vault/healthkit/restingHeartRate.json'
    );

    if (hrFirstContent)
      readFiles.set('./test-vault/healthkit/hr.json', hrFirstContent);
    if (hrvFirstContent)
      readFiles.set('./test-vault/healthkit/hrv.json', hrvFirstContent);
    if (tempFirstContent)
      readFiles.set(
        './test-vault/healthkit/bodySurfaceTemp.json',
        tempFirstContent
      );
    if (sleepFirstContent)
      readFiles.set('./test-vault/healthkit/sleep.json', sleepFirstContent);
    if (rhrFirstContent)
      readFiles.set(
        './test-vault/healthkit/restingHeartRate.json',
        rhrFirstContent
      );

    // Second ingestion with same data
    await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Update the mock reader with the latest written files
    const hrContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    const hrvContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    const tempContent = writtenFiles.get(
      './test-vault/healthkit/bodySurfaceTemp.json'
    );
    const sleepContent = writtenFiles.get('./test-vault/healthkit/sleep.json');
    const rhrContent = writtenFiles.get(
      './test-vault/healthkit/restingHeartRate.json'
    );

    if (hrContent) readFiles.set('./test-vault/healthkit/hr.json', hrContent);
    if (hrvContent)
      readFiles.set('./test-vault/healthkit/hrv.json', hrvContent);
    if (tempContent)
      readFiles.set('./test-vault/healthkit/bodySurfaceTemp.json', tempContent);
    if (sleepContent)
      readFiles.set('./test-vault/healthkit/sleep.json', sleepContent);
    if (rhrContent)
      readFiles.set('./test-vault/healthkit/restingHeartRate.json', rhrContent);

    // Verify heart_rate data wasn't duplicated
    const hrData = JSON.parse(hrContent!);
    expect(hrData.metrics).toHaveLength(2); // Still 2, not 4

    // Verify the message indicates no new data (or that incomplete entries were replaced if they existed)
    const result = await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );
    // Either no new data, or data was processed (which is fine for idempotency)
    expect(result.success).toBe(true);
    // If there are incomplete entries, they should be replaced; otherwise, no new data
    const hasNewData = result.message.includes('new entries');
    const hasNoNewData = result.message.includes('No new data');
    expect(hasNewData || hasNoNewData).toBe(true);
  });

  it('should merge new data with existing data', async () => {
    // Set up existing data
    const existingHrData = {
      metrics: [
        {
          Max: 90,
          Avg: 65,
          Min: 50,
          source: 'Ultrahuman',
          date: '2025-10-26 00:00:00 +0530',
        },
      ],
    };
    readFiles.set(
      './test-vault/healthkit/hr.json',
      JSON.stringify(existingHrData)
    );

    // Ingest new data
    await ingestHealthDataFromIssue(
      sampleHealthDataIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Verify merged data
    const hrContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    const hrData = JSON.parse(hrContent!);
    expect(hrData.metrics).toHaveLength(3); // 1 existing + 2 new
    expect(hrData.metrics[0].date).toBe('2025-10-26 00:00:00 +0530');
    expect(hrData.metrics[1].date).toBe('2025-10-27 00:00:00 +0530');
    expect(hrData.metrics[2].date).toBe('2025-10-28 00:00:00 +0530');
  });

  it('should handle invalid JSON in issue body', async () => {
    const issue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: 'invalid json',
    };

    const result = await ingestHealthDataFromIssue(
      issue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Error parsing health data');
    expect(commentsPosted.length).toBe(1);
    expect(commentsPosted[0]).toContain('❌');
  });

  it('should handle missing data.metrics array', async () => {
    const issue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: JSON.stringify({ data: {} }),
    };

    const result = await ingestHealthDataFromIssue(
      issue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('data.metrics');
    expect(commentsPosted.length).toBe(1);
    expect(commentsPosted[0]).toContain('❌');
  });

  it('should skip unknown metrics', async () => {
    const issue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: JSON.stringify({
        data: {
          metrics: [
            {
              name: 'unknown_metric',
              units: 'unit',
              data: [{ value: 1 }],
            },
            {
              name: 'heart_rate',
              units: 'count/min',
              data: [
                {
                  Max: 96,
                  Avg: 66,
                  Min: 51,
                  date: '2025-10-27 00:00:00 +0530',
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
      './test-vault/healthkit'
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Skipping unknown metric: unknown_metric');
    // Should still write heart_rate
    expect(writtenFiles.has('./test-vault/healthkit/hr.json')).toBe(true);
  });

  it('should overwrite old data with new data for the same date across multiple ingestions', async () => {
    // First ingestion with initial data
    const firstIssue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: JSON.stringify({
        data: {
          metrics: [
            {
              name: 'heart_rate',
              units: 'count/min',
              data: [
                {
                  Max: 90,
                  Avg: 65,
                  Min: 50,
                  source: 'Ultrahuman',
                  date: '2025-10-27 00:00:00 +0530',
                },
              ],
            },
            {
              name: 'heart_rate_variability',
              units: 'ms',
              data: [
                {
                  qty: 85.0,
                  date: '2025-10-27 00:00:00 +0530',
                },
              ],
            },
          ],
        },
      }),
    };

    await ingestHealthDataFromIssue(
      firstIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Setup mock reader with first ingestion results
    const hrFirstContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    const hrvFirstContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    if (hrFirstContent)
      readFiles.set('./test-vault/healthkit/hr.json', hrFirstContent);
    if (hrvFirstContent)
      readFiles.set('./test-vault/healthkit/hrv.json', hrvFirstContent);

    // Second ingestion with updated data for the same date
    const secondIssue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: JSON.stringify({
        data: {
          metrics: [
            {
              name: 'heart_rate',
              units: 'count/min',
              data: [
                {
                  Max: 100,
                  Avg: 70,
                  Min: 55,
                  source: 'Apple Watch',
                  date: '2025-10-27 00:00:00 +0530', // Same date
                },
              ],
            },
            {
              name: 'heart_rate_variability',
              units: 'ms',
              data: [
                {
                  qty: 95.5,
                  date: '2025-10-27 00:00:00 +0530', // Same date
                },
              ],
            },
          ],
        },
      }),
    };

    await ingestHealthDataFromIssue(
      secondIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Verify that old data was overwritten with new data
    const hrFinalContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    expect(hrFinalContent).toBeDefined();
    const hrFinalData = JSON.parse(hrFinalContent!);
    expect(hrFinalData.metrics).toHaveLength(1); // Only one entry (not duplicated)
    expect(hrFinalData.metrics[0].date).toBe('2025-10-27 00:00:00 +0530');
    expect(hrFinalData.metrics[0].Max).toBe(100); // New value, not 90
    expect(hrFinalData.metrics[0].Avg).toBe(70); // New value, not 65
    expect(hrFinalData.metrics[0].Min).toBe(55); // New value, not 50
    expect(hrFinalData.metrics[0].source).toBe('Apple Watch'); // New value, not "Ultrahuman"

    const hrvFinalContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    expect(hrvFinalContent).toBeDefined();
    const hrvFinalData = JSON.parse(hrvFinalContent!);
    expect(hrvFinalData.metrics).toHaveLength(1); // Only one entry (not duplicated)
    expect(hrvFinalData.metrics[0].date).toBe('2025-10-27 00:00:00 +0530');
    expect(hrvFinalData.metrics[0].qty).toBe(95.5); // New value, not 85.0
  });

  it('should maintain key order across multiple ingestions', async () => {
    // First ingestion
    const firstIssue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: JSON.stringify({
        data: {
          metrics: [
            {
              name: 'heart_rate',
              units: 'count/min',
              data: [
                {
                  date: '2025-10-26 00:00:00 +0530',
                  Min: 50,
                  Max: 90,
                  Avg: 65,
                  source: 'Ultrahuman',
                },
              ],
            },
            {
              name: 'heart_rate_variability',
              units: 'ms',
              data: [
                {
                  date: '2025-10-26 00:00:00 +0530',
                  qty: 80.0,
                },
              ],
            },
            {
              name: 'body_temperature',
              units: 'degC',
              data: [
                {
                  qty: 36.5,
                  date: '2025-10-26 00:00:00 +0530',
                },
              ],
            },
          ],
        },
      }),
    };

    await ingestHealthDataFromIssue(
      firstIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Setup mock reader with first ingestion results
    const hrFirstContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    const hrvFirstContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    const tempFirstContent = writtenFiles.get(
      './test-vault/healthkit/bodySurfaceTemp.json'
    );
    if (hrFirstContent)
      readFiles.set('./test-vault/healthkit/hr.json', hrFirstContent);
    if (hrvFirstContent)
      readFiles.set('./test-vault/healthkit/hrv.json', hrvFirstContent);
    if (tempFirstContent)
      readFiles.set(
        './test-vault/healthkit/bodySurfaceTemp.json',
        tempFirstContent
      );

    // Second ingestion with different dates
    const secondIssue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: JSON.stringify({
        data: {
          metrics: [
            {
              name: 'heart_rate',
              units: 'count/min',
              data: [
                {
                  source: 'Apple Watch',
                  date: '2025-10-27 00:00:00 +0530',
                  Avg: 70,
                  Max: 100,
                  Min: 55,
                },
              ],
            },
            {
              name: 'heart_rate_variability',
              units: 'ms',
              data: [
                {
                  date: '2025-10-27 00:00:00 +0530',
                  qty: 90.0,
                },
              ],
            },
            {
              name: 'body_temperature',
              units: 'degC',
              data: [
                {
                  date: '2025-10-27 00:00:00 +0530',
                  qty: 36.8,
                },
              ],
            },
          ],
        },
      }),
    };

    await ingestHealthDataFromIssue(
      secondIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Verify key order is maintained for heart_rate (should be: Max, Avg, Min, source, date)
    const hrFinalContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    expect(hrFinalContent).toBeDefined();
    const hrFinalData = JSON.parse(hrFinalContent!);
    expect(hrFinalData.metrics).toHaveLength(2);

    // Check key order for both entries
    const hrKeys1 = Object.keys(hrFinalData.metrics[0]);
    const hrKeys2 = Object.keys(hrFinalData.metrics[1]);

    // Expected order for heart_rate: Max, Avg, Min, source, date (from schema definition)
    expect(hrKeys1).toEqual(hrKeys2); // Both entries should have same key order
    // Verify the specific order matches schema definition
    expect(hrKeys1[0]).toBe('Max');
    expect(hrKeys1[1]).toBe('Avg');
    expect(hrKeys1[2]).toBe('Min');
    expect(hrKeys1[3]).toBe('source');
    expect(hrKeys1[4]).toBe('date');

    // Verify heart_rate_variability key order (should be: qty, date)
    const hrvFinalContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    expect(hrvFinalContent).toBeDefined();
    const hrvFinalData = JSON.parse(hrvFinalContent!);
    expect(hrvFinalData.metrics).toHaveLength(2);

    const hrvKeys1 = Object.keys(hrvFinalData.metrics[0]);
    const hrvKeys2 = Object.keys(hrvFinalData.metrics[1]);
    expect(hrvKeys1).toEqual(hrvKeys2); // Both entries should have same key order
    expect(hrvKeys1[0]).toBe('qty'); // qty should come before date
    expect(hrvKeys1[1]).toBe('date');

    // Verify body_temperature key order (should be: date, qty)
    const tempFinalContent = writtenFiles.get(
      './test-vault/healthkit/bodySurfaceTemp.json'
    );
    expect(tempFinalContent).toBeDefined();
    const tempFinalData = JSON.parse(tempFinalContent!);
    expect(tempFinalData.metrics).toHaveLength(2);

    const tempKeys1 = Object.keys(tempFinalData.metrics[0]);
    const tempKeys2 = Object.keys(tempFinalData.metrics[1]);
    expect(tempKeys1).toEqual(tempKeys2); // Both entries should have same key order
    expect(tempKeys1[0]).toBe('date'); // date should come before qty
    expect(tempKeys1[1]).toBe('qty');
  });

  it('should maintain date order across entries after multiple ingestions', async () => {
    // First ingestion with dates in middle range
    const firstIssue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: JSON.stringify({
        data: {
          metrics: [
            {
              name: 'heart_rate',
              units: 'count/min',
              data: [
                {
                  Max: 95,
                  Avg: 68,
                  Min: 52,
                  source: 'Ultrahuman',
                  date: '2025-10-28 00:00:00 +0530', // Middle date
                },
                {
                  Max: 92,
                  Avg: 65,
                  Min: 50,
                  source: 'Ultrahuman',
                  date: '2025-10-26 00:00:00 +0530', // Earlier date
                },
              ],
            },
            {
              name: 'heart_rate_variability',
              units: 'ms',
              data: [
                {
                  qty: 88.0,
                  date: '2025-10-29 00:00:00 +0530', // Later date
                },
              ],
            },
          ],
        },
      }),
    };

    await ingestHealthDataFromIssue(
      firstIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Setup mock reader with first ingestion results
    const hrFirstContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    const hrvFirstContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    if (hrFirstContent)
      readFiles.set('./test-vault/healthkit/hr.json', hrFirstContent);
    if (hrvFirstContent)
      readFiles.set('./test-vault/healthkit/hrv.json', hrvFirstContent);

    // Second ingestion with dates that should be inserted in correct order
    const secondIssue: HealthDataIssue = {
      title: 'HealthDataExport',
      body: JSON.stringify({
        data: {
          metrics: [
            {
              name: 'heart_rate',
              units: 'count/min',
              data: [
                {
                  Max: 100,
                  Avg: 70,
                  Min: 55,
                  source: 'Apple Watch',
                  date: '2025-10-30 00:00:00 +0530', // Latest date
                },
                {
                  Max: 85,
                  Avg: 62,
                  Min: 48,
                  source: 'Apple Watch',
                  date: '2025-10-25 00:00:00 +0530', // Earliest date
                },
                {
                  Max: 98,
                  Avg: 67,
                  Min: 51,
                  source: 'Apple Watch',
                  date: '2025-10-27 00:00:00 +0530', // Between existing dates
                },
              ],
            },
            {
              name: 'heart_rate_variability',
              units: 'ms',
              data: [
                {
                  qty: 92.0,
                  date: '2025-10-25 00:00:00 +0530', // Earlier date
                },
                {
                  qty: 90.0,
                  date: '2025-10-31 00:00:00 +0530', // Later date
                },
              ],
            },
          ],
        },
      }),
    };

    await ingestHealthDataFromIssue(
      secondIssue,
      mockWriter,
      mockReader,
      mockCommenter,
      './test-vault/healthkit'
    );

    // Verify heart_rate entries are sorted by date in ascending order
    const hrFinalContent = writtenFiles.get('./test-vault/healthkit/hr.json');
    expect(hrFinalContent).toBeDefined();
    const hrFinalData = JSON.parse(hrFinalContent!);
    expect(hrFinalData.metrics).toHaveLength(5); // 2 from first + 3 from second

    // Check dates are in ascending order
    const hrDates = hrFinalData.metrics.map((m: any) => m.date);
    expect(hrDates).toEqual([
      '2025-10-25 00:00:00 +0530', // Earliest
      '2025-10-26 00:00:00 +0530',
      '2025-10-27 00:00:00 +0530',
      '2025-10-28 00:00:00 +0530',
      '2025-10-30 00:00:00 +0530', // Latest
    ]);

    // Verify heart_rate_variability entries are sorted by date in ascending order
    const hrvFinalContent = writtenFiles.get('./test-vault/healthkit/hrv.json');
    expect(hrvFinalContent).toBeDefined();
    const hrvFinalData = JSON.parse(hrvFinalContent!);
    expect(hrvFinalData.metrics).toHaveLength(3); // 1 from first + 2 from second

    // Check dates are in ascending order
    const hrvDates = hrvFinalData.metrics.map((m: any) => m.date);
    expect(hrvDates).toEqual([
      '2025-10-25 00:00:00 +0530', // Earliest
      '2025-10-29 00:00:00 +0530',
      '2025-10-31 00:00:00 +0530', // Latest
    ]);
  });
});
