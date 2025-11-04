'use client';

import { useRouter } from 'next/navigation';

export default function GatewayHomePage() {
  const router = useRouter();

  const portals = [
    {
      name: 'Student Portal',
      description: 'Access your courses, assignments, and academic resources',
      path: '/student',
      color: 'blue',
      icon: '🎓',
      features: ['Course Catalog', 'My Courses', 'AI Chatbot', 'Assignments']
    },
    {
      name: 'Lecturer Portal', 
      description: 'Manage courses, students, and academic content',
      path: '/lecturer',
      color: 'green',
      icon: '👨‍🏫',
      features: ['Course Management', 'Student Analytics', 'Content Creation', 'Grading']
    },
    {
      name: 'Admin Portal',
      description: 'System administration and user management', 
      path: '/admin',
      color: 'purple',
      icon: '⚙️',
      features: ['User Management', 'System Settings', 'Analytics', 'Reports']
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        text: 'text-blue-600',
        bg: 'bg-blue-600 hover:bg-blue-700',
        border: 'border-blue-200',
        accent: 'bg-blue-50'
      },
      green: {
        text: 'text-green-600',
        bg: 'bg-green-600 hover:bg-green-700',
        border: 'border-green-200',
        accent: 'bg-green-50'
      },
      purple: {
        text: 'text-purple-600',
        bg: 'bg-purple-600 hover:bg-purple-700',
        border: 'border-purple-200',
        accent: 'bg-purple-50'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              LayAI Platform
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Intelligent Educational Platform
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Portal
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Select the appropriate portal to access your dashboard
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {portals.map((portal) => {
            const colors = getColorClasses(portal.color);
            return (
              <div 
                key={portal.name}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-2 ${colors.border} overflow-hidden`}
              >
                {/* Card Header */}
                <div className={`${colors.accent} p-6 text-center`}>
                  <div className="text-6xl mb-4">{portal.icon}</div>
                  <h3 className={`text-2xl font-bold ${colors.text} mb-2`}>
                    {portal.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {portal.description}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Key Features:
                  </h4>
                  <ul className="space-y-2 mb-6">
                    {portal.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-600 dark:text-gray-400">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => router.push(portal.path)}
                    className={`${colors.bg} text-white font-bold py-3 px-6 rounded-lg w-full transition-colors duration-200 transform hover:scale-105`}
                  >
                    Enter {portal.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Need Help?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Contact your system administrator or check the documentation for assistance.
            </p>
            <div className="flex justify-center space-x-4">
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                Documentation
              </button>
              <span className="text-gray-400">•</span>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                Support
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}