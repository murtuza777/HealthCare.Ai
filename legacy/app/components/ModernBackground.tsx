'use client';

import { motion } from 'framer-motion';

interface ModernBackgroundProps {
  variant?: 'light' | 'dark' | 'gradient';
  animated?: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

export default function ModernBackground({
  variant = 'light',
  animated = true,
  intensity = 'medium'
}: ModernBackgroundProps) {
  // Determine base color classes based on variant
  const baseClasses = {
    light: 'bg-white',
    dark: 'bg-gray-900',
    gradient: 'bg-gradient-to-br from-white to-gray-100'
  };

  // Configure blur intensity
  const blurIntensity = {
    low: 'blur-md',
    medium: 'blur-xl',
    high: 'blur-2xl'
  };

  // Configure animation variants
  const circleVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 0.8 }
  };

  // Configure circle colors based on variant
  const circleColors = {
    light: ['bg-red-200/40', 'bg-red-300/30', 'bg-red-100/20', 'bg-pink-100/30'],
    dark: ['bg-red-900/20', 'bg-red-800/30', 'bg-red-700/20', 'bg-red-600/30'],
    gradient: ['bg-red-200/30', 'bg-red-300/20', 'bg-pink-200/30', 'bg-rose-200/20']
  };

  return (
    <div className={`fixed inset-0 overflow-hidden -z-10 ${baseClasses[variant]}`}>
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid opacity-30"></div>
      
      {/* Animated Blur Orbs */}
      {animated && (
        <>
          <motion.div
            className={`absolute top-0 -left-20 w-72 h-72 rounded-full ${circleColors[variant][0]} ${blurIntensity[intensity]} filter`}
            initial="initial"
            animate={{
              x: [0, 20, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className={`absolute bottom-0 right-0 w-96 h-96 rounded-full ${circleColors[variant][1]} ${blurIntensity[intensity]} filter`}
            initial="initial"
            animate={{
              x: [0, -30, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className={`absolute top-1/4 right-1/4 w-64 h-64 rounded-full ${circleColors[variant][2]} ${blurIntensity[intensity]} filter`}
            initial="initial"
            animate={{
              x: [0, 40, 0],
              y: [0, -40, 0],
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div
            className={`absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full ${circleColors[variant][3]} ${blurIntensity[intensity]} filter`}
            initial="initial"
            animate={{
              x: [0, -20, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </>
      )}
      
      {/* Static Blur Elements */}
      {!animated && (
        <>
          <div className={`absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-red-200/30 to-transparent ${blurIntensity[intensity]} filter`}></div>
          <div className={`absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-t from-red-200/30 to-transparent ${blurIntensity[intensity]} filter`}></div>
          <div className={`absolute top-1/4 right-1/4 w-96 h-96 rounded-full ${circleColors[variant][0]} ${blurIntensity[intensity]} filter`}></div>
          <div className={`absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full ${circleColors[variant][2]} ${blurIntensity[intensity]} filter`}></div>
        </>
      )}
    </div>
  );
} 