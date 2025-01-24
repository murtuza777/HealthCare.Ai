'use client';

import { motion } from 'framer-motion';

const LoadingAnimation = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="relative w-24 h-24">
        {/* Heart outline */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1, opacity: 0.3 }}
          animate={{ scale: 1.2, opacity: 0 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-red-500">
            <path
              d="M50,20 C40,10 20,10 10,25 C0,40 0,50 0,60 C0,70 10,80 20,90 C30,100 40,100 50,90 C60,100 70,100 80,90 C90,80 100,70 100,60 C100,50 100,40 90,25 C80,10 60,10 50,20"
              fill="currentColor"
              strokeWidth="0"
            />
          </svg>
        </motion.div>
        
        {/* Pulse rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut"
            }}
          >
            <div className="w-full h-full rounded-full border-2 border-red-500" />
          </motion.div>
        ))}
        
        {/* ECG Line */}
        <motion.div
          className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-32 h-1"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg className="w-full h-8" viewBox="0 0 100 20">
            <path
              d="M0,10 L20,10 L25,0 L30,20 L35,10 L100,10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-red-500"
            />
          </svg>
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
