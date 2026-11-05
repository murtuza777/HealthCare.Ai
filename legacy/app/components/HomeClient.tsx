'use client';

import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeClientProps {
  children: ReactNode;
}

export default function HomeClient({ children }: HomeClientProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {isLoading ? (
          <div
            key="loading"
            className="fixed inset-0 flex items-center justify-center bg-black"
          >
            <div className="relative w-40 h-40">
              {/* Beating Heart */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16"
                animate={{
                  scale: [1, 1.2, 1],
                  color: ['#ff0000', '#ff3333', '#ff0000']
                }}
                transition={{
                  duration: 0.857,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <svg viewBox="0 0 32 32" fill="currentColor">
                  <path d="M16 28.7c-.9 0-1.7-.4-2.3-.9C8.4 23.2 4 18.8 4 14c0-4.4 3.6-8 8-8 2.1 0 4.1.8 5.6 2.3l.4.4.4-.4C19.9 6.8 21.9 6 24 6c4.4 0 8 3.6 8 8 0 4.8-4.4 9.2-9.7 13.8-.6.5-1.4.9-2.3.9z"/>
                </svg>
              </motion.div>

              {/* ECG Wave */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <motion.path
                  d="M 0,50 L 20,50 L 25,20 L 30,80 L 35,20 L 40,80 L 45,50 L 100,50"
                  fill="none"
                  stroke="#ff0000"
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: [0, 1],
                    opacity: [0.5, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </svg>

              {/* Loading Text */}
              <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-red-500 font-semibold tracking-wider"
                animate={{
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                INITIALIZING
              </motion.div>
            </div>
          </div>
        ) : (
          <div
            key="main"
            className="relative min-h-screen bg-black overflow-hidden"
          >
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            
            {/* Red Glow Effect */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/20 rounded-full filter blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/20 rounded-full filter blur-3xl" />
            </div>
            
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-red-900/30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <motion.div 
                    className="flex items-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-2xl font-bold text-white">
                      Healthcare<span className="text-red-600">.AI</span>
                    </span>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <a
                      href="/auth/login"
                      className="inline-flex items-center px-4 py-2 border border-red-600 text-sm font-medium rounded-full text-white hover:bg-red-600/10 transition-all duration-300"
                    >
                      Get Started
                    </a>
                  </motion.div>
                </div>
              </div>
            </nav>

            <div className="relative pt-32 pb-16 sm:pt-40">
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                  {children}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
