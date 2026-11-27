/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // The race page moved; old links, shared posts and sent notifications still land.
      { source: '/season', destination: '/cardanathon', permanent: true },
    ];
  },
};

export default nextConfig;
