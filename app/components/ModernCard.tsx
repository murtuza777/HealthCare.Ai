'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ModernCardProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  hoverEffect?: boolean;
  variant?: 'default' | 'outlined' | 'glass';
  className?: string;
  animate?: boolean;
}

export default function ModernCard({
  children,
  title,
  icon,
  hoverEffect = true,
  variant = 'default',
  className = '',
  animate = true
}: ModernCardProps) {
  // Base styles for all variants
  const baseClasses = "rounded-xl overflow-hidden";
  
  // Variant-specific styles
  const variantClasses = {
    default: "bg-white shadow-lg border border-gray-100",
    outlined: "border-2 border-red-100 bg-white",
    glass: "backdrop-blur-xl bg-white/30 border border-white/20 shadow-xl"
  };
  
  // Animation properties for hover effect
  const hoverAnimation = {
    whileHover: hoverEffect ? { 
      y: -5,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
    } : {},
    whileTap: hoverEffect ? { y: 0 } : {}
  };
  
  // Animation for initial load
  const loadAnimation = {
    initial: animate ? { opacity: 0, y: 20 } : {},
    animate: animate ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.4 }
  };

  return (
    <motion.div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...hoverAnimation}
      {...loadAnimation}
    >
      {/* Card Header (if title is provided) */}
      {(title || icon) && (
        <div className="flex items-center px-6 py-4 border-b border-gray-100">
          {icon && (
            <div className="mr-3 text-red-500">
              {icon}
            </div>
          )}
          {title && (
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          )}
        </div>
      )}
      
      {/* Card Body */}
      <div className="p-6">
        {children}
      </div>
      
      {/* Subtle gradient accent at the bottom */}
      <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500 opacity-80" />
    </motion.div>
  );
} 