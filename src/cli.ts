#!/usr/bin/env bun

import { program } from 'commander';
import config from '@src/config';
import { ingestHealthDataFromIssue } from '@src/healthkit';
import { ingestLocationDataFromIssue } from '@src/location';
import { createGitHubCommenter } from '@src/github';
import { generateDietMacrosIndex } from '@src/diet';

program.command('generate-diet-macros-index').action(async () => {
  try {
    const result = await generateDietMacrosIndex();
    console.log(result);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
});

program
  .command('process-issue')
  .option('--issue-number <number>', 'GitHub issue number', parseInt)
  .option('--issue-title <title>', 'GitHub issue title')
  .option('--issue-body <body>', 'GitHub issue body')
  .option('--issue-author <author>', 'GitHub issue author')
  .option('--issue-created-at <createdAt>', 'GitHub issue created timestamp')
  .action(async (options) => {
    try {
      const {
        issueNumber,
        issueTitle,
        issueBody,
        issueCreatedAt,
        issueAuthor,
      } = options;

      if (!issueNumber || !issueTitle || !issueBody) {
        console.error('Missing required issue parameters');
        process.exit(1);
      }

      if (issueBody.trim() === '') {
        console.error('Issue body cannot be empty');
        process.exit(1);
      }

      const normalizedAuthor = issueAuthor?.trim();
      if (
        normalizedAuthor !== '0x4444' &&
        normalizedAuthor !== 'shivekkhurana'
      ) {
        console.error(
          `Issue author is not authorized. Received: "${issueAuthor}" (normalized: "${normalizedAuthor}")`
        );
        console.error('Expected: "0x4444" or "shivekkhurana"');
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
        throw new Error('File not found');
      };

      // Route to appropriate processor based on issue title
      let result: { success: boolean; message: string };

      if (issueTitle === 'HealthDataExport') {
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
      } else if (issueTitle === 'LocationDataExport') {
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

      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('An error occurred:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
