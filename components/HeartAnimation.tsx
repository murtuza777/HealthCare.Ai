'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const HeartAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.2, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.6]);

  return (
    <div ref={containerRef} className="relative w-full h-[600px] overflow-hidden">
      {/* Background ECG Grid */}
      <div className="absolute inset-0 bg-grid opacity-5" />
      
      {/* Multiple ECG Lines for depth effect */}
      <motion.div 
        style={{ y, opacity }} 
        className="absolute inset-0 flex flex-col justify-center gap-20"
      >
        {[...Array(3)].map((_, i) => (
          <div key={i} className="relative h-1">
            <div className={`w-full h-full relative overflow-hidden opacity-${(3-i)*20}`}>
              <svg
                className={`absolute animate-ecg-${i+1}`}
                viewBox="0 0 1000 100"
                width="1000"
                height="100"
                preserveAspectRatio="none"
              >
                {/* Realistic ECG Pattern - Normal Sinus Rhythm at 70 BPM */}
                <path
                  className="text-red-500"
                  d="M0,50 
                     L30,50 
                     Q35,50 37,45 T40,50 
                     L50,50 
                     L55,20 
                     L57,80 
                     L59,20 
                     L61,50 
                     Q70,50 72,55 T75,50 
                     L100,50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Anatomical Heart */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ scale, opacity }}
      >
        <div className="relative w-96 h-96">
          <svg
            className="absolute w-full h-full animate-heartbeat filter drop-shadow-2xl"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <defs>
              {/* Main heart gradient */}
              <radialGradient id="heartGradient" cx="50%" cy="50%" r="75%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#ff8080" />
                <stop offset="40%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#991b1b" />
              </radialGradient>
              
              {/* Oxygenated blood gradient */}
              <linearGradient id="oxygenatedBlood" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              
              {/* Deoxygenated blood gradient */}
              <linearGradient id="deoxygenatedBlood" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>

              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Base heart structure */}
            <path
              className="heart-base"
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
              stroke="#4a0404"
              strokeWidth="0.5"
            />

            {/* Left Atrium */}
            <path
              className="left-atrium"
              d="M60,25 C65,20 75,20 80,30 C85,40 80,45 75,45"
              fill="none"
              stroke="#4a0404"
              strokeWidth="0.3"
            />

            {/* Right Atrium */}
            <path
              className="right-atrium"
              d="M40,25 C35,20 25,20 20,30 C15,40 20,45 25,45"
              fill="none"
              stroke="#4a0404"
              strokeWidth="0.3"
            />

            {/* Coronary Arteries */}
            <g className="coronary-arteries">
              {/* Left Coronary Artery */}
              <path
                d="M45,30 Q50,35 55,45 T60,60"
                fill="none"
                stroke="url(#oxygenatedBlood)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              
              {/* Right Coronary Artery */}
              <path
                d="M55,30 Q50,35 45,45 T40,60"
                fill="none"
                stroke="url(#oxygenatedBlood)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
            </g>

            {/* Pulmonary Veins */}
            <g className="pulmonary-veins">
              <path
                d="M70,25 L75,15 M65,25 L60,15"
                stroke="url(#oxygenatedBlood)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
            </g>

            {/* Pulmonary Arteries */}
            <g className="pulmonary-arteries">
              <path
                d="M30,25 L25,15 M35,25 L40,15"
                stroke="url(#deoxygenatedBlood)"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
            </g>

            {/* Heart Valves */}
            <g className="heart-valves">
              {/* Mitral Valve */}
              <path
                d="M55,40 Q50,45 45,40"
                stroke="#4a0404"
                strokeWidth="0.3"
                fill="none"
              />
              {/* Tricuspid Valve */}
              <path
                d="M45,40 Q50,45 55,40"
                stroke="#4a0404"
                strokeWidth="0.3"
                fill="none"
              />
            </g>
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

export default HeartAnimation;
