'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthBackground from '@/app/components/AuthBackground';

export default function VerifyPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setEmail(data.session?.user?.email || null);
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [supabase.auth]);

  const handleResendVerification = async () => {
    if (!email) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;
      
      alert('Verification email has been resent! Please check your inbox.');
    } catch (error) {
      console.error('Error resending verification:', error);
      alert('Failed to resend verification email. Please try again.');
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
      </motion.div>

      <motion.div 
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="backdrop-blur-lg bg-white/5 py-8 px-4 shadow-2xl rounded-xl sm:px-10 border border-white/10">
          <div className="text-center">
            <motion.div 
              className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-900/30 mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </motion.div>
            
            <h2 className="text-xl font-semibold mb-2 text-white">Check your email</h2>
            
            <p className="text-gray-300 mb-6">
              {email ? (
                <>
                  We've sent a verification link to <span className="font-semibold text-red-400">{email}</span>.
                  <br />
                  Please check your inbox and click the link to verify your account.
                </>
              ) : (
                'We\'ve sent a verification link to your email. Please check your inbox and click the link to verify your account.'
              )}
            </p>

            <div className="space-y-4">
              <motion.button
                onClick={handleResendVerification}
                disabled={loading || !email}
                whileHover={!(loading || !email) ? { scale: 1.02 } : {}}
                whileTap={!(loading || !email) ? { scale: 0.98 } : {}}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 ${
                  loading || !email ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                Resend verification email
              </motion.button>
              
              <Link href="/auth/login">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex justify-center py-2 px-4 border border-white/20 rounded-lg shadow-sm text-sm font-medium text-gray-200 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                >
                  Back to sign in
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 