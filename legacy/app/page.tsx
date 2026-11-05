'use client';

import FuturisticMedicalAnimation from '@/components/FuturisticMedicalAnimation';
import HomeClient from '@/app/components/HomeClient';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <HomeClient>
      <>
        <FuturisticMedicalAnimation />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 space-y-12 pt-20 max-w-6xl mx-auto px-4"
        >
          {/* Title Section */}
          <div className="space-y-4">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-red-500 font-semibold tracking-wider uppercase text-sm md:text-base"
            >
              The Future of Healthcare
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-6xl md:text-8xl font-bold tracking-tight text-white"
            >
              Healthcare
              <span className="text-red-600 inline-block ml-4 animate-pulse-glow">
                .AI
              </span>
            </motion.h1>
          </div>

          {/* Subtitle Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-3xl mx-auto"
          >
            <p className="text-xl md:text-2xl leading-relaxed text-gray-300 glass-effect p-8 rounded-2xl backdrop-blur-lg border border-white/10">
              Experience a revolutionary approach to healthcare, where{' '}
              <span className="text-red-500 font-semibold">advanced AI</span> and{' '}
              <span className="text-white font-semibold">cutting-edge technology</span>{' '}
              converge to transform your well-being journey.
            </p>
          </motion.div>

          {/* Buttons Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8"
          >
            <motion.a
              href="/auth/login"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex items-center px-12 py-4 text-lg font-medium text-white bg-gradient-to-r from-red-600 to-red-500 rounded-full overflow-hidden shadow-lg hover:shadow-red-500/50 transition-all duration-300"
            >
              <span className="relative z-10 flex items-center font-semibold tracking-wide">
                Launch Platform
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.a>
            <motion.a
              href="#learn-more"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group inline-flex items-center px-12 py-4 text-lg font-medium text-white border-2 border-red-600/50 rounded-full hover:bg-red-600/10 hover:border-red-600 transition-all duration-300"
            >
              <span className="flex items-center font-semibold tracking-wide">
                Learn More
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-y-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </motion.a>
          </motion.div>

          {/* Additional Decorative Element */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-20"
          />
        </motion.div>
      </>
    </HomeClient>
  );
}