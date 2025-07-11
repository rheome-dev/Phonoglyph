/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: ["@phonoglyph/config"],
}

module.exports = nextConfig 