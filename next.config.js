/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exclude Supabase Edge Functions from Next.js compilation
  webpack: (config, { isServer }) => {
    // Exclude Supabase Edge Functions from compilation
    if (isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [...(config.watchOptions?.ignored || []), '**/supabase/functions/**']
      };
    }
    return config;
  },
}

module.exports = nextConfig