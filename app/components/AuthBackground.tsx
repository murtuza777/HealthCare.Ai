'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AuthBackground() {
  // Use useState for client-side only rendering of random elements
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Pre-calculate random positions and values
  const crosses = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      left: `${(i * 20) + 5}%`, // Deterministic positioning based on index
      top: `${(i * 20) + 5}%`,  // Deterministic positioning based on index
      opacity: isClient ? (0.1 + (Math.random() * 0.1)) : 0.15, // Only randomize on client
      fontSize: isClient ? `${24 + Math.floor(Math.random() * 16)}px` : '30px', // Only randomize on client
      duration: 5 + i,
      delay: i
    }));
  }, [isClient]);

  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      width: isClient ? (1 + Math.floor(Math.random() * 3)) : 2,
      height: isClient ? (1 + Math.floor(Math.random() * 3)) : 2,
      left: `${(i * 3) % 100}%`,  // Deterministic positioning based on index
      top: `${(i * 3.5) % 100}%`, // Deterministic positioning based on index
      opacity: isClient ? (0.1 + (Math.random() * 0.2)) : 0.2,
      color: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#3b82f6' : '#ffffff',
      duration: 5 + (i % 5),
      delay: i % 3
    }));
  }, [isClient]);

  const pulses = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      left: `${10 + (i * 15)}%`,  // Deterministic positioning based on index
      top: `${10 + (i * 15)}%`,   // Deterministic positioning based on index
      width: `${100 + (i * 20)}px`,  // Deterministic sizing based on index
      height: `${100 + (i * 20)}px`, // Deterministic sizing based on index
      opacity: isClient ? (0.05 + (Math.random() * 0.1)) : 0.1,
      duration: 5 + i,
      delay: i
    }));
  }, [isClient]);

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