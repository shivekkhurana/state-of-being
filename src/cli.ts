#!/usr/bin/env bun

import { program } from "commander";
import {
  setCurrentValueOfWorkoutKeyResult,
  createMonthlyWorkoutKeyResult,
  saveWorkoutStatsToVault,
} from "@src/workouts";
import {
  saveSleepStatsToVault,
  saveUltrahumanInsightsToVault,
} from "@src/sleep";
import { getCurrentYear, getCurrentMonth } from "@src/time";
import config from "@src/config";
import {
  saveMeditationAggregatesToVault,
  createMonthlyObservationsKeyResult,
  createMonthlyMeditationsKeyResult,
  setCurrentValueOfMeditationsKeyResult,
  setCurrentValueOfObservationsKeyResult,
} from "@src/meditations";
import { ingestHealthDataFromIssue } from "@src/healthkit";
import { ingestLocationDataFromIssue } from "@src/location";
import { createGitHubCommenter, closeGitHubIssue } from "@src/github";

// Update the value of monthly key results, on a daily basis
program
  .command("set-current-value-of-workout-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear().toString()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth().toString()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await setCurrentValueOfWorkoutKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program
  .command("set-current-value-of-meditations-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear().toString()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth().toString()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await setCurrentValueOfMeditationsKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program
  .command("set-current-value-of-observations-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear().toString()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth().toString()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await setCurrentValueOfObservationsKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

// Create monthly key results for meditations, workouts and observations
program
  .command("create-monthly-workout-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear().toString()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth().toString()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await createMonthlyWorkoutKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program
  .command("create-monthly-meditations-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear().toString()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth().toString()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await createMonthlyMeditationsKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program
  .command("create-monthly-observations-key-result")
  .option(
    "-y, --year <year>",
    "Year for the workout key result",
    getCurrentYear().toString()
  )
  .option(
    "-m, --month <month>",
    "Month for the workout key result",
    getCurrentMonth().toString()
  )
  .action(async (options) => {
    try {
      const { year, month } = options;
      const result = await createMonthlyObservationsKeyResult(year, month);
      console.log(result);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  });

program.command("save-workout-stats-to-vault").action(async () => {
  try {
    const savePath = config.workoutStatsSavePath;
    const res = await saveWorkoutStatsToVault(savePath);
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

program.command("save-next-sleep-stats-to-vault").action(async () => {
  try {
    const folderPath = config.ultrahumanFolderPath;
    const res = await saveUltrahumanInsightsToVault(
      config.ULTRAHUMAN_R1_TOKEN,
      folderPath
    );
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

program.command("save-sleep-aggregate-stats-to-vault").action(async () => {
  try {
    const res = await saveSleepStatsToVault(
      config.ultrahumanFolderPath,
      config.ultrahumanSleepAggregatesSavePath
    );
    console.log(res);
  } catch (error) {
    console.log(error);
  }
});

// Aggregates are computed for month, but should be written daily so it stays updated
program
  .command("save-monthly-meditation-aggregates-to-vault")
  .option(
    "-y, --year <year>",
    "Year for which to compute aggregates",
    getCurrentYear().toString()
  )
  .option(
    "-m, --month <month>",
    "Month for which to compute aggregates",
    getCurrentMonth().toString()
  )
  .action(async (options: { year?: number; month?: number }) => {
    try {
      const { year, month } = options;
      const result = await saveMeditationAggregatesToVault(
        config.meditationAggregatesSavePath,
        config.NOTION_TOKEN,
        month,
        year
      );
      console.log(result);
    } catch (error) {
      console.log(error);
    }
  });

program
  .command("process-issue")
  .option("--issue-number <number>", "GitHub issue number", parseInt)
  .option("--issue-title <title>", "GitHub issue title")
  .option("--issue-body <body>", "GitHub issue body")
  .option("--issue-author <author>", "GitHub issue author")
  .option("--issue-created-at <createdAt>", "GitHub issue created timestamp")
  .action(async (options) => {
    try {
      const { issueNumber, issueTitle, issueBody, issueCreatedAt, issueAuthor } = options;

      if (!issueNumber || !issueTitle || !issueBody) {
        console.error("Missing required issue parameters");
        process.exit(1);
      }

      if (issueBody.trim() === "") {
        console.error("Issue body cannot be empty");
        process.exit(1);
      }

      const normalizedAuthor = issueAuthor?.trim();
      if (normalizedAuthor !== "0x4444") {
        console.error(`Issue author is not authorized. Received: "${issueAuthor}" (normalized: "${normalizedAuthor}")`);
        console.error("Expected: \"0x4444\"");
        process.exit(1);
      }

      // Create GitHub commenter if token is available
      const githubToken = process.env.GITHUB_TOKEN;
      const githubRepo = process.env.GITHUB_REPOSITORY;
      let commenter: ((comment: string) => Promise<void>) | undefined;

      if (githubToken && githubRepo && issueNumber) {
        commenter = createGitHubCommenter(githubToken, githubRepo, issueNumber);
      }

      // Create file writer/reader functions
      const writer = async (path: string, content: string) => {
        await Bun.write(path, content);
      };

      const reader = async (path: string): Promise<string> => {
        const file = Bun.file(path);
        if (await file.exists()) {
          return await file.text();
        }
        throw new Error("File not found");
      };

      // Route to appropriate processor based on issue title
      let result: { success: boolean; message: string };

      if (issueTitle === "HealthDataExport") {
        // Ingest the health data
        result = await ingestHealthDataFromIssue(
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
      } else if (issueTitle === "LocationDataExport") {
        // Ingest the location data
        result = await ingestLocationDataFromIssue(
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
      } else {
        const errorMsg = `Unknown issue type: ${issueTitle}. Expected "HealthDataExport" or "LocationDataExport"`;
        console.error(errorMsg);
        if (commenter) {
          await commenter(`❌ ${errorMsg}`);
        }
        result = {
          success: false,
          message: errorMsg,
        };
      }

      // Close the issue if processing was successful
      if (result.success && githubToken && githubRepo && issueNumber) {
        try {
          await closeGitHubIssue(githubToken, githubRepo, issueNumber);
          console.log("Issue closed successfully");
        } catch (error) {
          console.error("Failed to close issue:", error);
          // Don't fail the whole process if closing fails
        }
      }

      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error("An error occurred:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
