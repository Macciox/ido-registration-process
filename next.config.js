/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exclude Supabase Edge Functions from Next.js compilation
  webpack: (config, { isServer }) => {
    // Exclude Supabase Edge Functions from compilation
    config.module.rules.push({
      test: /supabase\/functions\/.+/,
      loader: 'ignore-loader',
    });
    return config;
  },
}

module.exports = nextConfig