'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Use Next.js 13+ import style for Link
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthBackground from '@/app/components/AuthBackground';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          console.log('Existing session found, redirecting to dashboard');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router, supabase.auth]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error during sign in:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address to reset your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) throw resetError;

      alert('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      console.error('Error during password reset:', err);
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  // Show a loading indicator while checking the session
  if (loading && !error && !formData.email && !formData.password) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 relative">
        <AuthBackground />
        <div className="z-10 text-white text-center">
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xl font-medium"
          >
            Loading...
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <AuthBackground />

      <motion.div 
        className="sm:mx-auto sm:w-full sm:max-w-md z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div onClick={() => router.push('/')} className="cursor-pointer">
          <h2 className="text-center text-3xl font-extrabold text-white hover:text-red-400 transition-colors">
            Healthcare.AI
          </h2>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-white">
          Sign in to your account
        </h2>
      </motion.div>

      <motion.div 
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="backdrop-blur-lg bg-white/5 py-8 px-4 shadow-2xl rounded-xl sm:px-10 border border-white/10">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <motion.div 
                className="bg-red-900/30 border border-red-500/30 p-4 mb-4 rounded-lg"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-700 rounded bg-white/10"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-200">
                  Remember me
                </label>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleResetPassword}
                className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                Forgot password?
              </motion.button>
            </div>

            <div>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </motion.button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black/30 backdrop-blur-lg text-gray-400">New to Healthcare.AI?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/auth/signup')}
                className="cursor-pointer"
              >
                <span className="font-medium text-red-400 hover:text-red-300 transition-colors">
                  Create an account
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 