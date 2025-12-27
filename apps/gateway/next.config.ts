import type { NextConfig } from "next";
import { existsSync } from "node:fs";

const isDocker = existsSync("/.dockerenv");

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@layai/ui", "@layai/store", "@layai/utils", "@layai/types"],
  allowedDevOrigins: (process.env.NEXT_ALLOWED_DEV_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  
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
    const backendBase =
      process.env.GATEWAY_BACKEND_URL || (isDocker ? 'http://backend:8080' : 'http://127.0.0.1:8080');
    const studentBase =
      process.env.GATEWAY_STUDENT_URL || (isDocker ? 'http://student-web:3000' : 'http://127.0.0.1:3001');
    const lecturerBase =
      process.env.GATEWAY_LECTURER_URL || (isDocker ? 'http://lecturer-web:3000' : 'http://127.0.0.1:3002');
    const adminBase =
      process.env.GATEWAY_ADMIN_URL || (isDocker ? 'http://admin-web:3000' : 'http://127.0.0.1:3003');

    return [
      // API routes - proxy to backend
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: '/student/_next/:path*',
        destination: `${studentBase}/student/_next/:path*`,
      },
      {
        source: '/lecturer/_next/:path*',
        destination: `${lecturerBase}/lecturer/_next/:path*`,
      },
      {
        source: '/admin/_next/:path*',
        destination: `${adminBase}/admin/_next/:path*`,
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
