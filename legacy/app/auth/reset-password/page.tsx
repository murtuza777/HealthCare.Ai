'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthBackground from '@/app/components/AuthBackground';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setEmail(data.user.email);
      }
    };
    getUser();
  }, [supabase.auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <AuthBackground />

      <motion.div 
        className="sm:mx-auto sm:w-full sm:max-w-md z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/">
          <h2 className="text-center text-3xl font-extrabold text-white hover:text-red-400 cursor-pointer transition-colors">
            Healthcare.AI
          </h2>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold text-white">
          Reset Your Password
        </h2>
        {email && (
          <p className="mt-2 text-center text-sm text-gray-300">
            For <span className="font-medium text-red-400">{email}</span>
          </p>
        )}
      </motion.div>

      <motion.div 
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="backdrop-blur-lg bg-white/5 py-8 px-4 shadow-2xl rounded-xl sm:px-10 border border-white/10">
          {success ? (
            <div className="text-center">
              <motion.div 
                className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-900/30 mb-4"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h3 className="text-lg font-medium text-white">Password reset successful!</h3>
              <p className="mt-2 text-sm text-gray-300">
                Your password has been reset. You will be redirected to the login page shortly.
              </p>
              <div className="mt-6">
                <Link href="/auth/login">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                  >
                    Go to login
                  </motion.button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && (
                <motion.div 
                  className="bg-red-900/30 border border-red-500/30 p-4 rounded-lg"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-200">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="appearance-none block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg shadow-sm placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 transition-colors"
                  />
                </div>
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
                  {loading ? 'Resetting...' : 'Reset Password'}
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
} 