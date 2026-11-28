/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // The race page moved; old links, shared posts and sent notifications still land.
      { source: '/season', destination: '/cardanathon', permanent: true },
      // The Scoreboard became the Hall of Fame (Jason, 2026-11-27). Filters in the query string carry over.
      { source: '/scoreboard', destination: '/hall-of-fame', permanent: true },
    ];
  },
};

export default nextConfig;
