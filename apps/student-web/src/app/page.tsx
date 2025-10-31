'use client';

import { useRouter } from 'next/navigation';

export default function StudentHomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Welcome to Student Portal
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Access your courses, assignments, and academic resources
          </p>
          <div className="space-y-4">
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg mr-4"
            >
              Student Login
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}