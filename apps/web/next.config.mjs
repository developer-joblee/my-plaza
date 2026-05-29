/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three'],
  output: 'standalone',
  allowedDevOrigins: ['192.168.68.*', '192.168.1.*', '10.0.0.*', '10.0.1.*'],
}

export default nextConfig
