'use client';

import { motion } from 'framer-motion';

interface LoadingAnimationProps {
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingAnimation({ 
  text = "LOADING", 
  fullScreen = false 
}: LoadingAnimationProps) {
  return (
    <div className={`
      flex items-center justify-center bg-black/90 backdrop-blur-xl
      ${fullScreen ? 'fixed inset-0 z-50' : 'w-full h-full min-h-[200px] rounded-xl'}`
    }>
      <div className="relative w-32 h-32">
        {/* Beating Heart */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12"
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

        {/* DNA Helix in Background */}
        <div className="absolute inset-0 -z-10">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`helix-${i}`}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: i % 2 === 0 ? '#ff0000' : '#ffffff',
                boxShadow: i % 2 === 0 
                  ? '0 0 10px rgba(255, 0, 0, 0.5)' 
                  : '0 0 10px rgba(255, 255, 255, 0.5)',
              }}
              animate={{
                x: [
                  Math.cos(i * Math.PI / 3) * 20,
                  Math.cos((i * Math.PI / 3) + Math.PI) * 20,
                  Math.cos(i * Math.PI / 3) * 20
                ],
                y: [
                  Math.sin(i * Math.PI / 3) * 20 + 50,
                  Math.sin((i * Math.PI / 3) + Math.PI) * 20 + 50,
                  Math.sin(i * Math.PI / 3) * 20 + 50
                ],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2
              }}
            />
          ))}
        </div>

        {/* Loading Text */}
        <motion.div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-red-500 font-semibold tracking-wider text-sm"
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {text}
        </motion.div>
      </div>
    </div>
  );
} 