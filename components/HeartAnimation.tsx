'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const HeartAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.1, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.6]);

  return (
    <div ref={containerRef} className="absolute top-0 right-0 w-[45%] h-screen">
      {/* ECG Grid Background */}
      <div className="absolute inset-0 bg-grid opacity-5" />
      
      {/* ECG Lines */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="relative h-20 mb-8">
            <motion.div 
              className="w-full h-full"
              initial={{ x: 0 }}
              animate={{ x: -200 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                delay: i * -1
              }}
            >
              <svg
                className="absolute h-full w-[200%]"
                preserveAspectRatio="none"
                viewBox="0 0 500 100"
              >
                <path
                  d="M0,50 L100,50 L110,50 L115,20 L120,80 L125,50 L140,50 L400,50"
                  className="text-red-500"
                  stroke="currentColor"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Heart */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ scale, opacity }}
      >
        <div className="relative w-96 h-96">
          <svg
            className="w-full h-full animate-heartbeat filter drop-shadow-2xl"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <defs>
              <radialGradient id="heartGradient" cx="50%" cy="50%" r="75%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#fecdd3" />
                <stop offset="40%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#be123c" />
              </radialGradient>
              
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Main Heart Shape */}
            <path
              d="M50,20 
                 C40,10 20,10 10,25
                 C0,40 0,50 0,60
                 C0,70 10,80 20,90
                 C30,100 40,100 50,90
                 C60,100 70,100 80,90
                 C90,80 100,70 100,60
                 C100,50 100,40 90,25
                 C80,10 60,10 50,20"
              fill="url(#heartGradient)"
              filter="url(#glow)"
            />

            {/* Arteries */}
            <g className="animate-pulse">
              <path
                d="M30,30 C35,25 45,25 50,35"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
              />
              <path
                d="M70,30 C65,25 55,25 50,35"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
              />
            </g>
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

export default HeartAnimation;
