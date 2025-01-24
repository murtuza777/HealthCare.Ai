'use client';

import { useState, useEffect } from 'react';
import HeartAnimation from '@/components/HeartAnimation';
import LoadingAnimation from '@/components/LoadingAnimation';

export default function HomeClient() {
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
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                HeartCare.AI
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
              <button className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-20 pb-16 lg:pt-32">
            <div className="lg:w-1/2">
              <h1 className="text-5xl font-bold leading-tight mb-6">
                Advanced Cardiac Care
                <span className="block text-red-600 mt-2">Powered by AI</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Experience the future of heart health monitoring with real-time analysis
                and personalized insights powered by artificial intelligence.
              </p>
              <div className="flex space-x-4">
                <button className="px-8 py-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all transform hover:scale-105">
                  Start Monitoring
                </button>
                <button className="px-8 py-4 border-2 border-red-600 text-red-600 rounded-full hover:bg-red-50 transition-all">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Heart Animation */}
        <HeartAnimation />
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Advanced Features</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our cutting-edge technology provides comprehensive heart health monitoring
              and analysis for better cardiac care.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Real-time Monitoring",
                description: "Continuous heart rhythm analysis with instant alerts for any irregularities.",
                icon: "🫀"
              },
              {
                title: "AI Analysis",
                description: "Advanced algorithms process your heart data to provide actionable insights.",
                icon: "🤖"
              },
              {
                title: "Expert Support",
                description: "Direct connection to cardiac specialists for professional guidance.",
                icon: "👨‍⚕️"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="relative p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow group"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-br from-red-600 to-red-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Take Control of Your Heart Health?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who trust HeartCare.AI for their cardiac monitoring needs.
          </p>
          <button className="px-8 py-4 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors">
            Get Started Now
          </button>
        </div>
      </section>
    </main>
  );
}
