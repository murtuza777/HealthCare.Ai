'use client';

import { motion } from 'framer-motion';

interface QuickReplyButtonProps {
  text: string;
  onClick: (text: string) => void;
}

export default function QuickReplyButton({ text, onClick }: QuickReplyButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium 
                 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      onClick={() => onClick(text)}
    >
      {text}
    </motion.button>
  );
}
