'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
  });

  const validateForm = () => {
    let isValid = true;
    const errors = { email: '', password: '' };

    if (!formData.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email address';
      isValid = false;
    }

    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Call the login API
      // Use gateway-relative API path so it works in Docker and local dev
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const token = data?.token;
        const user = data?.user;
        const role = user?.role;
        const status = user?.status;

        if (typeof token === 'string' && token && role === 'student' && status === 'active') {
          if (formData.rememberMe) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
          } else {
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(user));
          }
          router.push('/dashboard');
          return;
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setError('Only active student accounts can sign in here.');
      } else {
        // Handle API error response
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check if the server is running and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg border border-zinc-200">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Student Login</h2>
            <p className="mt-2 text-sm text-zinc-600">Sign in to access your dashboard</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="w-full">
                <input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  className={[
                    'flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    formErrors.email ? 'border-red-500 focus-visible:ring-red-500' : '',
                  ].join(' ')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                />
                {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
              </div>

              <div className="w-full">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    className={[
                      'flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 pr-12 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                      formErrors.password ? 'border-red-500 focus-visible:ring-red-500' : '',
                    ].join(' ')}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 text-sm text-zinc-600 hover:text-zinc-900"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-700">
                  Remember me
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Login failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white ring-offset-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? (
                <span className="inline-flex items-center">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
