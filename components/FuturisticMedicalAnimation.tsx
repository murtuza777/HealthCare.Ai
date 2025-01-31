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

  // Helper function to create helix coordinates
  const createHelixPoints = (index: number, offset: number = 0) => {
    const angle = (index * 0.5) + offset;
    const radius = 20;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
    >
      {/* Pulsing Medical Plus Sign */}
      <div className="absolute top-8 left-8 z-50">
        <motion.div
          className="relative w-12 h-12"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Main Plus Shape */}
          <motion.div
            className="absolute inset-0"
            animate={{
              boxShadow: [
                '0 0 20px rgba(255, 0, 0, 0.3)',
                '0 0 40px rgba(255, 0, 0, 0.6)',
                '0 0 20px rgba(255, 0, 0, 0.3)',
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-red-600 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-8 bg-red-600 rounded-full" />
          </motion.div>
          
          {/* Glowing Ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: '2px solid rgba(255, 0, 0, 0.5)',
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </div>

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

      {/* Advanced 3D Rotating DNA */}
      <div className="absolute top-20 right-20 w-96 h-40 perspective-1000">
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateZ: 360 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Backbone Strands */}
          {[...Array(2)].map((_, strand) => (
            <div
              key={`backbone-${strand}`}
              className="absolute inset-0"
              style={{
                transform: `translateZ(${strand === 0 ? '20' : '-20'}px)`,
              }}
            >
              <motion.div
                className="absolute h-1 w-full bg-gradient-to-r from-red-600/50 via-red-600 to-red-600/50"
                style={{
                  top: '50%',
                }}
              />
            </div>
          ))}

          {/* Base Pairs and Connections */}
          {[...Array(12)].map((_, i) => {
            const frontHelix = createHelixPoints(i);
            const backHelix = createHelixPoints(i, Math.PI);
            return (
              <div key={`pair-${i}`} className="absolute inset-0">
                {/* Front Base */}
                <motion.div
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    left: `${(i * 100) / 12}%`,
                    top: `${50 + frontHelix.y}%`,
                    transform: `translateX(-50%) translateZ(${frontHelix.x}px)`,
                    background: i % 2 === 0 ? '#ff0000' : '#ffffff',
                    boxShadow: i % 2 === 0 
                      ? '0 0 10px rgba(255, 0, 0, 0.5)' 
                      : '0 0 10px rgba(255, 255, 255, 0.5)',
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
                {/* Back Base */}
                <motion.div
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    left: `${(i * 100) / 12}%`,
                    top: `${50 + backHelix.y}%`,
                    transform: `translateX(-50%) translateZ(${backHelix.x}px)`,
                    background: i % 2 === 0 ? '#ffffff' : '#ff0000',
                    boxShadow: i % 2 === 0 
                      ? '0 0 10px rgba(255, 255, 255, 0.5)' 
                      : '0 0 10px rgba(255, 0, 0, 0.5)',
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
                {/* Base Pair Connection */}
                <div
                  className="absolute h-px"
                  style={{
                    left: `${(i * 100) / 12}%`,
                    top: '50%',
                    width: '40px',
                    transform: `translateX(-50%) rotateY(${i * 30}deg)`,
                    background: 'linear-gradient(90deg, rgba(255,0,0,0.5), rgba(255,255,255,0.5))',
                  }}
                />
              </div>
            );
          })}
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