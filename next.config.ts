
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.jfn.ac.lk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'eng.jfn.ac.lk',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
