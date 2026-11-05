'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { FaUser, FaRobot } from 'react-icons/fa';
import QuickReplyButton from './QuickReplyButton';
import EmergencyAlert from './EmergencyAlert';
import { Message } from '../utils/types';

interface ChatMessageProps {
  message: Message;
  onQuickReplyClick?: (reply: string) => void;
  onCallEmergency?: () => void;
  onCallDoctor?: () => void;
}

export default function ChatMessage({
  message,
  onQuickReplyClick,
  onCallEmergency,
  onCallDoctor
}: ChatMessageProps) {
  const isEmergency = message.type === 'emergency';
  const hasQuickReplies = message.type === 'quick_replies' && message.quickReplies && message.quickReplies.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col ${message.isBot ? 'items-start' : 'items-end'}`}
    >
      <div className={`flex ${message.isBot ? 'flex-row' : 'flex-row-reverse'} items-start space-x-2`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
                      ${message.isBot ? 'bg-red-100' : 'bg-gray-100'}`}>
          {message.isBot ? (
            <FaRobot className="w-5 h-5 text-red-600" />
          ) : (
            <FaUser className="w-5 h-5 text-gray-600" />
          )}
        </div>

        <div className={`space-y-2 ${message.isBot ? 'mr-12' : 'ml-12'}`}>
          {/* Message Content */}
          <div
            className={`px-4 py-2 rounded-lg ${
              message.isBot
                ? 'bg-white border border-gray-200'
                : 'bg-red-600 text-white'
            }`}
          >
            <ReactMarkdown
              className={`text-sm ${message.isBot ? 'text-gray-800' : 'text-white'}`}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>

          {/* Quick Replies */}
          {hasQuickReplies && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.quickReplies?.map((reply, index) => (
                <QuickReplyButton
                  key={index}
                  text={reply}
                  onClick={() => onQuickReplyClick?.(reply)}
                />
              ))}
            </div>
          )}

          {/* Emergency Alert */}
          {isEmergency && onCallEmergency && onCallDoctor && (
            <EmergencyAlert
              onCallEmergency={onCallEmergency}
              onCallDoctor={onCallDoctor}
            />
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span className="text-xs text-gray-400 mt-1">
        {new Date(message.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </span>
    </motion.div>
  );
}
