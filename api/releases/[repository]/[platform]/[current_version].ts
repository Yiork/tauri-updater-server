import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

const OWNER = process.env.OWNER;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error(
    "GITHUB_TOKEN is not set. Please set it in your environment variables.",
  );
}

const PLATFORMS: [string[], string][] = [
  [["linux-x86_64"], "amd64.AppImage.tar.gz"],
  [["darwin-x86_64", "darwin-aarch64"], "app.tar.gz"],
  [["windows-x86_64"], "x64_en-US.msi.zip"],
];

type ReleaseResponse = {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    [platform: string]: {
      url?: string;
      signature?: string;
    };
  };
};

type GithubRelease = {
  tag_name: string;
  body: string;
  published_at: string;
  assets: {
    id: number;
    name: string;
    browser_download_url: string;
  }[];
};

let cachedRelease: ReleaseResponse | null = null;
let lastFetchTime = 0;

const getLatestGhRelease = async (
  repository: string,
): Promise<ReleaseResponse> => {
  const now = Date.now();
  if (now - lastFetchTime > 5 * 60 * 1000 || cachedRelease === null) {
    const githubLatestReleaseUrl = `https://api.github.com/repos/${OWNER}/${repository}/releases/latest`;

    try {
      const { data: release } = await axios.get<GithubRelease>(
        githubLatestReleaseUrl,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      const releaseResponse: ReleaseResponse = {
        version: release.tag_name,
        notes: release.body
          .replace(
            /See the assets to download this version and install\.?$/,
            "",
          )
          .trim(),
        pub_date: release.published_at,
        platforms: {},
      };

      for (const asset of release.assets) {
        for (const [forPlatforms, extension] of PLATFORMS) {
          if (asset.name.endsWith(extension)) {
            for (const platform of forPlatforms) {
              releaseResponse.platforms[platform] = {
                ...releaseResponse.platforms[platform],
                url: asset.browser_download_url,
              };
            }
          } else if (asset.name.endsWith(`${extension}.sig`)) {
            try {
              const { data: signature } = await axios.get<string>(
                `https://api.github.com/repos/${OWNER}/${repository}/releases/assets/${asset.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                    Accept: "application/octet-stream",
                  },
                },
              );

              for (const platform of forPlatforms) {
                releaseResponse.platforms[platform] = {
                  ...releaseResponse.platforms[platform],
                  signature,
                };
              }
            } catch (error) {
              console.error("Error fetching signature:", error);
            }
          }
        }
      }

      cachedRelease = releaseResponse;
      lastFetchTime = now;
    } catch (error) {
      console.error("Error fetching latest release:", error.message);
      return {} as ReleaseResponse;
    }
  }
  return cachedRelease;
};

export default async (req: VercelRequest, res: VercelResponse) => {
  const { repository, platform, current_version } = req.query;
  console.log(repository, platform, current_version);

  if (
    !repository ||
    !platform ||
    !current_version ||
    Array.isArray(repository) ||
    Array.isArray(platform) ||
    Array.isArray(current_version)
  ) {
    return res.status(400).json({
      error: "Missing or invalid repository, platform or current version",
    });
  }

  const latestRelease = await getLatestGhRelease(repository);

  if (Object.keys(latestRelease).length === 0) {
    return res.status(204).end();
  }

  try {
    const latestVersion = latestRelease.version;
    const [latestMaj, latestMin, latestPatch] = latestVersion
      .replace(/^v/, "")
      .split(".");
    const [curMaj, curMin, curPatch] = current_version
      .replace(/^v/, "")
      .split(".");

    if (
      curMaj === latestMaj &&
      curMin === latestMin &&
      curPatch === latestPatch
    ) {
      return res.status(204).end();
    }
  } catch (error) {
    return res.status(204).end();
  }

  return res.status(200).json(latestRelease);
};
