'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function AuthBackground() {
  // Pre-calculate random positions and values to prevent hydration mismatch
  const crosses = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      left: `${Math.floor(Math.random() * 100)}%`,
      top: `${Math.floor(Math.random() * 100)}%`,
      opacity: 0.1 + (Math.random() * 0.1),
      fontSize: `${24 + Math.floor(Math.random() * 16)}px`,
      duration: 5 + Math.floor(Math.random() * 5),
      delay: Math.floor(Math.random() * 2)
    }));
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      width: 1 + Math.floor(Math.random() * 3),
      height: 1 + Math.floor(Math.random() * 3),
      left: `${Math.floor(Math.random() * 100)}%`,
      top: `${Math.floor(Math.random() * 100)}%`,
      opacity: 0.1 + (Math.random() * 0.2),
      color: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#3b82f6' : '#ffffff',
      duration: 5 + Math.floor(Math.random() * 5),
      delay: Math.floor(Math.random() * 3)
    }));
  }, []);

  const pulses = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      left: `${10 + Math.floor(Math.random() * 80)}%`,
      top: `${10 + Math.floor(Math.random() * 80)}%`,
      width: `${100 + Math.floor(Math.random() * 100)}px`,
      height: `${100 + Math.floor(Math.random() * 100)}px`,
      opacity: 0.05 + (Math.random() * 0.1),
      duration: 5 + Math.floor(Math.random() * 5),
      delay: Math.floor(Math.random() * 5)
    }));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 w-full h-full bg-gradient-to-br from-black via-gray-900 to-blue-900 overflow-hidden">
      {/* ECG Line Animation */}
      <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <motion.path
          d="M0,540 L320,540 L340,400 L360,680 L380,400 L400,680 L420,540 L1920,540"
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1],
            opacity: [0.3, 0.8]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </svg>
      
      {/* Medical crosses */}
      {crosses.map((cross, i) => (
        <motion.div
          key={`cross-${i}`}
          className="absolute text-red-500"
          style={{
            left: cross.left,
            top: cross.top,
            opacity: cross.opacity,
            fontSize: cross.fontSize
          }}
          animate={{
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: cross.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: cross.delay
          }}
        >
          +
        </motion.div>
      ))}
      
      {/* Grid lines for a medical dashboard feel */}
      <div className="absolute inset-0 bg-grid opacity-5"></div>
      
      {/* Floating particles */}
      {particles.map((particle, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            width: particle.width,
            height: particle.height,
            left: particle.left,
            top: particle.top,
            opacity: particle.opacity,
            backgroundColor: particle.color
          }}
          animate={{
            y: [0, -10, 0],
            x: [0, Math.random() * 10 - 5, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay
          }}
        />
      ))}
      
      {/* Pulsing circles */}
      {pulses.map((pulse, i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute rounded-full border border-blue-500/30"
          style={{
            left: pulse.left,
            top: pulse.top,
            width: pulse.width,
            height: pulse.height,
            opacity: pulse.opacity
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 0.2, 0]
          }}
          transition={{
            duration: pulse.duration,
            repeat: Infinity,
            ease: "easeOut",
            delay: pulse.delay
          }}
        />
      ))}
      
      {/* Subtle data wave at bottom */}
      <svg className="absolute bottom-0 w-full h-1/4 opacity-10" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <motion.path
          d="M0,160 C320,300,420,240,640,160 C860,80,960,120,1280,160 L1440,160 L1440,320 L0,320 Z"
          fill="#3b82f6"
          initial={{ y: 10 }}
          animate={{ y: [10, -10, 10] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
      
      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent"></div>
    </div>
  );
} 