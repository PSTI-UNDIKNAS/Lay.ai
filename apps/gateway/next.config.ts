import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  transpilePackages: ["@layai/ui", "@layai/store", "@layai/utils", "@layai/types"],
  
  async redirects() {
    return [
      // Redirect root to student portal
      {
        source: '/',
        destination: '/student/login',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      // API routes - proxy to backend
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      // Student portal - proxy to student-web
      {
        source: '/student/:path*',
        destination: 'http://localhost:3001/student/:path*',
      },
      {
        source: '/student',
        destination: 'http://localhost:3001/student',
      },
      // Lecturer portal - proxy to lecturer-web
      {
        source: '/lecturer/:path*',
        destination: 'http://localhost:3002/lecturer/:path*',
      },
      {
        source: '/lecturer',
        destination: 'http://localhost:3002/lecturer',
      },
      // Admin portal - proxy to admin-web
      {
        source: '/admin/:path*',
        destination: 'http://localhost:3003/admin/:path*',
      },
      {
        source: '/admin',
        destination: 'http://localhost:3003/admin',
      },
    ];
  },
};

export default nextConfig;