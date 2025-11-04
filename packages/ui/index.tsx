import React, { useState } from 'react';

// Loading Spinner Component
export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Login Form Component
interface LoginFormProps {
  expectedRole?: 'student' | 'lecturer' | 'admin';
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ expectedRole, onSuccess }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Mock login for now - replace with actual auth logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={credentials.email}
          onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={credentials.password}
          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <LoadingSpinner /> : 'Sign In'}
      </button>
    </form>
  );
};

// Auth Guard Component
interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'lecturer' | 'admin';
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRole, 
  fallback = <div>Access denied</div> 
}) => {
  // Mock authentication check - replace with actual auth logic
  const isAuthenticated = false;
  const userRole = 'student';

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};