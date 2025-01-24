'use client';

import { useRouter } from 'next/navigation';
import HeartAnimation from "@/components/HeartAnimation";
import { supabase } from '@/lib/supabase';
import { Heart } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="w-6 h-6 text-red-600 animate-pulse" />
            <h1 className="text-xl font-bold text-gray-900">HeartCare.AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignIn}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleSignUp}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Parallax Effect */}
      <section className="relative min-h-screen pt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative z-10 text-center lg:text-left">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Advanced Heart Care
                <span className="text-red-600 block mt-2">at Your Fingertips</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                Experience the future of cardiac care with AI-powered monitoring, real-time analysis, 
                and personalized health insights tailored just for you.
              </p>
              <button
                onClick={handleSignUp}
                className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 text-lg font-semibold shadow-xl hover:shadow-2xl"
              >
                Start Your Heart Health Journey
              </button>
            </div>
            <div className="relative z-0">
              <HeartAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Gradient Background */}
      <section className="relative py-20 bg-gradient-to-b from-white via-red-50 to-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Why Choose HeartCare.AI?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🔬"
              title="AI-Powered Analysis"
              description="Advanced algorithms analyze your heart data to provide personalized insights and early detection of potential issues."
            />
            <FeatureCard
              icon="📱"
              title="24/7 Monitoring"
              description="Continuous heart monitoring and real-time alerts ensure your peace of mind around the clock."
            />
            <FeatureCard
              icon="👨‍⚕️"
              title="Expert Support"
              description="Connect with certified cardiologists and healthcare professionals for personalized care and guidance."
            />
          </div>
        </div>
      </section>

      {/* Footer with Dark Theme */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-6 h-6 text-red-500" />
                <span className="text-lg font-bold">HeartCare.AI</span>
              </div>
              <p className="text-gray-400">
                Advanced heart health monitoring and management
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-8 md:mt-0">
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2">
                  <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                  <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                  <li><a href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
                  <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} HeartCare.AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
      <span className="text-4xl mb-4 block">{icon}</span>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}