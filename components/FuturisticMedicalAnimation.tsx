'use client';

import { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';

const FuturisticMedicalAnimation = () => {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [controls, isInView]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
    >
      {/* DNA Double Helix */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`helix-${i}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.2, 1],
              x: Math.sin(i * 0.5) * 100,
              y: i * 30,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: i * 0.1,
            }}
            className="absolute left-1/2"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: i % 2 === 0 ? '#ff0000' : '#ffffff',
              boxShadow: i % 2 === 0 
                ? '0 0 20px rgba(255, 0, 0, 0.5)' 
                : '0 0 20px rgba(255, 255, 255, 0.5)',
            }}
          />
        ))}
      </div>

      {/* 3D Rotating DNA */}
      <div className="absolute top-20 right-20 w-40 h-80 perspective-1000">
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: 360 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {[...Array(20)].map((_, i) => (
            <div key={`strand-${i}`} className="absolute w-full">
              <motion.div
                className="absolute left-0 w-4 h-4 rounded-full"
                style={{
                  top: `${(i * 100) / 20}%`,
                  transform: `translateX(${Math.sin(i * 0.5) * 20}px) scale(${0.8 + Math.cos(i * 0.5) * 0.2})`,
                  background: '#ff0000',
                  boxShadow: '0 0 15px rgba(255, 0, 0, 0.5)',
                }}
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
              <motion.div
                className="absolute right-0 w-4 h-4 rounded-full"
                style={{
                  top: `${(i * 100) / 20}%`,
                  transform: `translateX(${-Math.sin(i * 0.5) * 20}px) scale(${0.8 + Math.cos(i * 0.5) * 0.2})`,
                  background: '#ffffff',
                  boxShadow: '0 0 15px rgba(255, 255, 255, 0.5)',
                }}
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
              <motion.div
                className="absolute left-1/2 h-px w-full -translate-x-1/2"
                style={{
                  top: `${(i * 100) / 20}%`,
                  background: 'linear-gradient(90deg, rgba(255,0,0,0.5), rgba(255,255,255,0.5))',
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scanning Lines */}
      <div className="absolute inset-0">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`scan-${i}`}
            className="absolute w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"
            initial={{ y: -100 }}
            animate={{
              y: ['0%', '100%'],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3,
              delay: i * 0.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Heartbeat Line */}
      <div className="absolute bottom-0 left-0 right-0 h-20">
        <div className="w-full h-full">
          <svg className="w-full h-full" viewBox="0 0 1000 100">
            <motion.path
              d="M0,50 L200,50 L230,20 L260,80 L290,20 L320,80 L350,50 L1000,50"
              fill="none"
              stroke="#ff0000"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{
                pathLength: [0, 1],
                opacity: [0.5, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FuturisticMedicalAnimation; 