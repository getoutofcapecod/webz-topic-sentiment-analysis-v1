import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is hand-maintained, so Next must not regenerate it.
  agentRules: false,
};

export default nextConfig;
