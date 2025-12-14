/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  transpilePackages: ["@phonoglyph/config", "remotion"],
  webpack: (config, { isServer }) => {
    // Fix for @hookform/resolvers trying to import from zod/v4/core
    // which doesn't exist - replace the import with zod
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^zod\/v4\/core$/,
        require.resolve('zod')
      )
    );
    
    // Also add alias as fallback
    config.resolve.alias = {
      ...config.resolve.alias,
      'zod/v4/core': require.resolve('zod'),
    };
    
    return config;
  },
}

module.exports = nextConfig 