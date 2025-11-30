import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "";

const nextConfig: NextConfig = {
  output: "export", // enables static export to ./out
  trailingSlash: true,
  assetPrefix: isGithubPages && repoName ? `/${repoName}/` : undefined,
  basePath: isGithubPages && repoName ? `/${repoName}` : undefined,
};

export default nextConfig;
