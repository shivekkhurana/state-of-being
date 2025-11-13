# Commit Message Guidelines

When creating commit messages, follow these steps to ensure consistency with the project's commit history:

## Process

1. **Analyze Git History**: Read the past git log (last 20-50 commits) to understand the commit message structure and emoji usage patterns

   ```bash
   git log --oneline -30
   ```

2. **Review Changes**: Check what changes are staged or to be committed

   ```bash
   git status
   git diff --staged
   ```

3. **Select Appropriate Emoji**: Choose a relevant emoji prefix based on the type of change, following the established patterns in the repository

4. **Write Descriptive Message**: Create a clear, concise commit message that describes what was changed and why

## Emoji Guide

Based on the project's commit history, use these emojis for different types of changes:

- **🤖** - Automated saves, data operations, or bot-generated commits

  - Example: `🤖 Save data to vault`
  - Example: `🤖 Update healthkit metrics`

- **🛎️** - Workflow triggers, deployments, or CI/CD changes

  - Example: `🛎️ Trigger website deployment after issue processing`
  - Example: `🛎️ Update deployment workflow`

- **🔗** - Adding links, connections, or integrations

  - Example: `🔗 Add links to rhr and location`
  - Example: `🔗 Connect to external API`

- **🗑️** - Deletions, removals, or cleanup

  - Example: `🗑️ Delete last two rhr to test workflow`
  - Example: `🗑️ Remove unused dependencies`

- **❤️** - Adding new features, metrics, or functionality

  - Example: `❤️ Add rhr metrics`
  - Example: `❤️ Implement new health tracking feature`

- **🧹** - Code cleanup, refactoring, or removing hacks

  - Example: `🧹 Remove Ultrahuman API hack`
  - Example: `🧹 Clean up unused code`

- **🐞** - Bug fixes or corrections

  - Example: `🐞 Change file commitback pattern`
  - Example: `🐞 Fix location parsing issue`

- **🪵** - Logging, debugging, or diagnostic changes

  - Example: `🪵 Add logs to debug why location was not committed`
  - Example: `🪵 Improve error logging`

- **🫆** - Permissions, access control, or authorization

  - Example: `🫆 Allow shivekkhurana to trigger flows too`
  - Example: `🫆 Update repository permissions`

- **📍** - Location-related changes

  - Example: `📍 Add location ingestor`
  - Example: `📍 Update location tracking logic`

- **📋** - Validation, checks, or configuration

  - Example: `📋 Add a check for empty issue body`
  - Example: `📋 Validate input parameters`

- **⚙️** - Configuration or settings changes

  - Example: `⚙️ Update workflow configuration`
  - Example: `⚙️ Change environment variables`

- **📝** - Documentation updates

  - Example: `📝 Update README with new features`
  - Example: `📝 Add API documentation`

- **🚀** - Performance improvements or optimizations

  - Example: `🚀 Optimize data processing`
  - Example: `🚀 Improve query performance`

- **✨** - New features or enhancements

  - Example: `✨ Add new meditation tracking`
  - Example: `✨ Enhance workout analysis`

- **🔧** - Tooling or build system changes
  - Example: `🔧 Update build configuration`
  - Example: `🔧 Add new development tools`

## Message Format

- **Format**: `[emoji] [Capitalized action verb] [description]`
- **Length**: Keep messages concise but descriptive (50-72 characters ideal)
- **Language**: Use present tense, imperative mood
- **Capitalization**: Capitalize the first letter after the emoji

## Examples

### Good Examples:

```
🤖 Save data to vault
🛎️ Trigger website deployment after issue processing
🔗 Add links to rhr and location
🗑️ Delete last two rhr to test workflow
❤️ Add rhr metrics
🧹 Remove Ultrahuman API hack
🐞 Change file commitback pattern
🪵 Add logs to debug why location was not committed
🫆 Allow shivekkhurana to trigger flows too
📍 Add location ingestor
📋 Add a check for empty issue body
```

### Bad Examples:

```
❌ save data (missing emoji, not capitalized)
❌ 🤖 saved data to vault (past tense)
❌ 🤖Save data to vault (no space after emoji)
❌ 🤖 SAVE DATA TO VAULT (all caps)
❌ Fixed bug (missing emoji, vague)
❌ 🤖 data vault save (wrong word order)
```

## Workflow Integration

When committing changes:

1. Run `git log --oneline -30` to see recent commit patterns
2. Run `git status` and `git diff --staged` to understand changes
3. Identify the primary type of change (feature, fix, cleanup, etc.)
4. Select the appropriate emoji from the guide above
5. Write a clear, concise message following the format
6. Verify the message matches the project's style before committing
