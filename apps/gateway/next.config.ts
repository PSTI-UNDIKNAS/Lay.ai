import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    const isProd = process.env.NODE_ENV === 'production';
    const backendBase = isProd ? 'http://backend:8080' : 'http://localhost:8080';
    const studentBase = isProd ? 'http://student-web:3000' : 'http://localhost:3001';
    const lecturerBase = isProd ? 'http://lecturer-web:3000' : 'http://localhost:3002';
    const adminBase = isProd ? 'http://admin-web:3000' : 'http://localhost:3003';

    return [
      // API routes - proxy to backend
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
      // Student portal - proxy to student-web
      {
        source: '/student/:path*',
        destination: `${studentBase}/student/:path*`,
      },
      {
        source: '/student',
        destination: `${studentBase}/student`,
      },
      // Lecturer portal - proxy to lecturer-web
      {
        source: '/lecturer/:path*',
        destination: `${lecturerBase}/lecturer/:path*`,
      },
      {
        source: '/lecturer',
        destination: `${lecturerBase}/lecturer`,
      },
      // Admin portal - proxy to admin-web
      {
        source: '/admin/:path*',
        destination: `${adminBase}/admin/:path*`,
      },
      {
        source: '/admin',
        destination: `${adminBase}/admin`,
      },
    ];
  },
};

export default nextConfig;