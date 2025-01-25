'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { FaRobot, FaUser } from 'react-icons/fa';

interface ChatMessageProps {
  message: string;
  isBot: boolean;
}

export default function ChatMessage({ message, isBot }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start space-x-3 ${isBot ? 'bg-gray-50' : ''} p-4 rounded-lg`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isBot ? 'bg-red-100' : 'bg-blue-100'
      }`}>
        {isBot ? (
          <FaRobot className="w-4 h-4 text-red-600" />
        ) : (
          <FaUser className="w-4 h-4 text-blue-600" />
        )}
      </div>
      <div className="flex-grow">
        <div className={`text-sm ${isBot ? 'text-gray-800' : 'text-gray-700'}`}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              a: ({ children, href }) => (
                <a href={href} className="text-red-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {message}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
