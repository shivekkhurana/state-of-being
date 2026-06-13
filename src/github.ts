import axios from "axios";

/**
 * Creates a function that posts comments to a GitHub issue
 */
export function createGitHubCommenter(
  token: string,
  repository: string,
  issueNumber: number
): (comment: string) => Promise<void> {
  const [owner, repo] = repository.split("/");
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;

  return async (comment: string): Promise<void> => {
    try {
      await axios.post(
        apiUrl,
        { body: comment },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
    } catch (error) {
      // Log error but don't throw - we don't want comment failures to break ingestion
      console.error("Failed to post GitHub comment:", error);
    }
  };
}
