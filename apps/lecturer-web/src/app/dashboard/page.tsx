'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  unique_identifier: string;
}

export default function LecturerDashboard() {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    }
  }, [router]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: '📊' },
    { name: 'My Courses', icon: '📚' },
    { name: 'My Students', icon: '👥' },
    { name: 'AI Chatbot', icon: '🤖' },
    { name: 'Settings', icon: '⚙️' },
  ];

  // Show loading if user data is not loaded yet
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg relative">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Lecturer Portal</h2>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveItem(item.name)}
              className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                activeItem === item.name
                  ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Profile Section */}
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{user.name}</p>
              <button 
                onClick={handleSignOut}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Lecturer Dashboard</h1>
          <p className="mt-4 text-gray-600">Welcome back, {user.name}!</p>
          <p className="mt-2 text-sm text-gray-500">ID: {user.unique_identifier}</p>
        </div>
      </div>
    </div>
  );
}