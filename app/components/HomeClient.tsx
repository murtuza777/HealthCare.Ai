'use client';

import { useState, useEffect, ReactNode } from 'react';
import HeartAnimation from '@/components/HeartAnimation';
import LoadingAnimation from '@/components/LoadingAnimation';

interface HomeClientProps {
  children: ReactNode;
}

export default function HomeClient({ children }: HomeClientProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-gray-50 to-white overflow-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-red-600">Healthcare.AI</span>
            </div>
            <div>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative pt-32 pb-16 sm:pt-40">
        <HeartAnimation />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
