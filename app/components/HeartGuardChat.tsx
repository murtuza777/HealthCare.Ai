'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaHeart, FaPhone, FaExclamationTriangle } from 'react-icons/fa';
import ChatMessage from './ChatMessage';
import { Message, HealthProfile, HealthMetrics, Symptom } from '../utils/types';
import { generateResponse } from '../utils/chatUtils';
import { getExerciseRecommendations, getDietRecommendations, getRiskAssessment } from '../utils/api';

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  text: `Hello! I'm your HeartGuard AI assistant. I can help you with:

1. Post-heart attack recovery guidance
2. Heart attack prevention strategies
3. Risk assessment and predictions
4. Lifestyle recommendations
5. Medication management

How can I assist you today?`,
  isBot: true,
  timestamp: new Date(),
  type: 'quick_replies',
  quickReplies: [
    'Check My Heart Health',
    'Review My Medications',
    'Track My Symptoms',
    'Get Exercise Tips',
    'Emergency Help'
  ]
};

// Sample health metrics - In a real app, this would come from real-time monitoring
const sampleMetrics: HealthMetrics = {
  heartRate: 72,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  cholesterol: 180,
  weight: 70,
  lastUpdated: new Date()
};

// Sample symptoms - In a real app, this would come from user input
const sampleSymptoms: Symptom[] = [
  {
    type: 'chest pain',
    severity: 3,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    description: 'Mild discomfort while walking',
    duration: 10,
    accompaniedBy: ['shortness of breath']
  }
];

// Sample user profile - In a real app, this would come from your backend
const sampleProfile: HealthProfile = {
  hasHeartCondition: true,
  hadHeartAttack: true,
  lastHeartAttack: new Date('2024-12-01'),
  medications: [
    {
      name: 'Aspirin',
      dosage: '81mg',
      frequency: 'Once daily',
      timeOfDay: ['Morning'],
      startDate: new Date('2024-12-01'),
    },
    {
      name: 'Metoprolol',
      dosage: '25mg',
      frequency: 'Twice daily',
      timeOfDay: ['Morning', 'Evening'],
      startDate: new Date('2024-12-01'),
    }
  ],
  allergies: ['Penicillin'],
  conditions: ['Hypertension', 'High Cholesterol'],
  familyHistory: ['Father - Heart Attack at 60'],
  lifestyle: {
    smoker: false,
    alcoholConsumption: 'light',
    exerciseFrequency: 3,
    diet: 'Mediterranean',
    stressLevel: 6
  }
};

export default function HeartGuardChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isEmergencyMode) {
      // Add emergency warning sound or visual effects
      document.body.style.backgroundColor = 'rgba(254, 226, 226, 0.5)';
      return () => {
        document.body.style.backgroundColor = '';
      };
    }
  }, [isEmergencyMode]);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isBot: false,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Get AI response with all context
      const response = await generateResponse(
        text,
        sampleProfile,
        sampleMetrics,
        sampleSymptoms,
        messages
      );

      setIsEmergencyMode(response.isEmergency);
      setMessages(prev => [...prev, ...response.messages]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I'm having trouble processing your request. Please try again or contact your healthcare provider if this is urgent.",
        isBot: true,
        timestamp: new Date(),
        type: 'text'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    await handleSendMessage(userMessage);
  };

  const handleQuickReply = async (reply: string) => {
    await handleSendMessage(reply);
  };

  const handleEmergencyCall = () => {
    window.location.href = 'tel:911';
  };

  const handleDoctorCall = () => {
    // In a real app, this would use the actual doctor's number from the user's profile
    window.location.href = 'tel:+1234567890';
  };

  return (
    <div className={`flex flex-col h-[600px] bg-white rounded-lg shadow-lg transition-all duration-300
                    ${isEmergencyMode ? 'ring-2 ring-red-500' : ''}`}>
      {/* Chat Header */}
      <div className="flex items-center space-x-2 p-4 border-b">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <FaHeart className={`w-5 h-5 text-red-600 ${isEmergencyMode ? 'animate-pulse' : ''}`} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">HeartGuard AI Assistant</h3>
          <p className="text-sm text-gray-500">Always here to help</p>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          {isEmergencyMode && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEmergencyCall}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg 
                       hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <FaExclamationTriangle className="w-4 h-4" />
              <span>Emergency Call</span>
            </motion.button>
          )}
          <button 
            onClick={handleDoctorCall}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <FaPhone className="w-4 h-4" />
            <span>Call Doctor</span>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onQuickReplyClick={handleQuickReply}
              onCallEmergency={handleEmergencyCall}
              onCallDoctor={handleDoctorCall}
            />
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 text-gray-500"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isEmergencyMode ? 'Emergency mode active - Please follow instructions above' : 'Type your message...'}
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 
                      ${isEmergencyMode ? 'border-red-300 focus:ring-red-500' : 'focus:ring-red-500'}`}
            disabled={isEmergencyMode}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isEmergencyMode}
            className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${isEmergencyMode 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}`}
          >
            <FaPaperPlane className="w-5 h-5" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
