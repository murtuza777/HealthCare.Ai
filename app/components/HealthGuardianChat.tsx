'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaHeart, FaPhone, FaExclamationTriangle } from 'react-icons/fa';
import ChatMessage from './ChatMessage';
import { Message } from '../utils/types';
import { generateResponse } from '../utils/chatUtils';
import { getExerciseRecommendations, getDietRecommendations, getRiskAssessment } from '../utils/api';
import { usePatient } from '../context/PatientContext';
import {
  HealthProfile as SupabaseHealthProfile,
  HealthMetrics as SupabaseHealthMetrics,
  Symptom as SupabaseSymptom,
  Medication as SupabaseMedication
} from '../utils/supabase';
import LoadingAnimation from './LoadingAnimation';

// Create conversion functions between Supabase and local data models
const convertHealthProfile = (profile: SupabaseHealthProfile | null): any => {
  if (!profile) return {
    name: "User",
    age: 0,
    height: 0,
    weight: 0,
    hasHeartCondition: false,
    hadHeartAttack: false,
    medications: [],
    allergies: [],
    conditions: [],
    familyHistory: [],
    lifestyle: {
      smoker: false,
      alcoholConsumption: 'light' as 'light',
      exerciseFrequency: 0,
      diet: '',
      stressLevel: 0
    }
  };
  
  return {
    name: profile.user_id,
    age: profile.age || 0,
    height: profile.height || 0,
    weight: profile.weight || 0,
    hasHeartCondition: profile.has_heart_condition || false,
    hadHeartAttack: profile.had_heart_attack || false,
    lastHeartAttack: profile.last_heart_attack,
    medications: [], // Will be provided separately
    allergies: profile.allergies || [],
    conditions: profile.conditions || [],
    familyHistory: profile.family_history || [],
    lifestyle: profile.lifestyle || {
      smoker: false,
      alcoholConsumption: 'light' as 'light',
      exerciseFrequency: 0,
      diet: '',
      stressLevel: 0
    }
  };
};

const convertHealthMetrics = (metrics: SupabaseHealthMetrics | null): any => {
  if (!metrics) return {
    heartRate: 70,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    cholesterol: 180,
    weight: 70,
    lastUpdated: new Date()
  };
  
  return {
    heartRate: metrics.heart_rate || 70,
    bloodPressureSystolic: metrics.blood_pressure_systolic || 120,
    bloodPressureDiastolic: metrics.blood_pressure_diastolic || 80,
    cholesterol: metrics.cholesterol || 180,
    weight: metrics.weight || 70,
    lastUpdated: metrics.recorded_at || new Date()
  };
};

const convertSymptoms = (symptoms: SupabaseSymptom[]): any[] => {
  if (!symptoms || !Array.isArray(symptoms)) return [];
  
  return symptoms.map(symptom => ({
    type: symptom.type || '',
    severity: symptom.severity || 0,
    timestamp: symptom.timestamp || new Date(),
    description: symptom.description || '',
    duration: symptom.duration || 0,
    accompaniedBy: symptom.accompanied_by || []
  }));
};

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  text: `Hello! I'm your Health Guardian AI assistant. I can help you with:

1. Personalized health recommendations
2. Lifestyle and wellness guidance
3. Medication management
4. Symptom assessment
5. Diet and exercise planning
6. Mental health support
7. General health queries

To get started, please make sure your health profile is up to date in the Overview section. This helps me provide more accurate and personalized advice.

How can I assist you today?`,
  isBot: true,
  timestamp: new Date(),
  type: 'quick_replies',
  quickReplies: [
    '🏥 Start Health Assessment',
    '🤒 Describe Symptoms',
    '💊 Medication Help',
    '🥗 Diet & Exercise',
    '🧘‍♂️ Mental Health'
  ]
};

// Function to check if a message is a greeting
const isGreeting = (text: string): boolean => {
  const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
  return greetings.some(greeting => text.includes(greeting));
};

export default function HealthGuardianChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get real patient data from context
  const { healthProfile, healthMetrics, symptoms, medications, isLoading } = usePatient();
  
  // Convert Supabase models to local models for the AI chat functionality
  const convertedProfile = convertHealthProfile(healthProfile);
  const convertedMetrics = convertHealthMetrics(healthMetrics);
  const convertedSymptoms = convertSymptoms(symptoms);
  
  // Check if data is ready for use
  useEffect(() => {
    if (!isLoading) {
      try {
        // If profile exists, add medications
        if (convertedProfile && medications) {
          convertedProfile.medications = medications.map(med => ({
            name: med.name || '',
            dosage: med.dosage || '',
            frequency: med.frequency || '',
            timeOfDay: Array.isArray(med.time_of_day) ? med.time_of_day : [],
            startDate: med.start_date || new Date()
          }));
        }
        setDataReady(true);
      } catch (error) {
        console.error('Error preparing data for HealthGuardianChat:', error);
        // Create default data if there's an error
        convertedProfile.medications = [];
        setDataReady(true);
      }
    }
  }, [isLoading, healthProfile, healthMetrics, symptoms, medications]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isEmergencyMode) {
      document.body.style.backgroundColor = 'rgba(254, 226, 226, 0.5)';
      return () => {
        document.body.style.backgroundColor = '';
      };
    }
  }, [isEmergencyMode]);

  const handleSendMessage = async (text: string) => {
    try {
      // Check if profile data is available
      if (!dataReady) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: "I'm still loading your health data. Please wait a moment or continue with general health questions.",
          isBot: true,
          timestamp: new Date(),
          type: 'quick_replies',
          quickReplies: ['❓ General Health', '🏥 Common Questions', '⏱️ Wait for Data']
        }]);
        return;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        text,
        isBot: false,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);

      // Handle greeting messages specially
      if (isGreeting(text.toLowerCase())) {
        const conditionsMessage = (convertedProfile.conditions && convertedProfile.conditions.length > 0)
          ? `are managing ${convertedProfile.conditions.join(' and ')}.`
          : 'have no major health conditions recorded.';
          
        const greetingResponse: Message = {
          id: Date.now().toString(),
          text: `Hello! I'm here to help you with your health concerns. I see from your profile that you ${conditionsMessage}

How are you feeling today?

I can provide:
• Personalized health assessments
• Symptom analysis and recommendations
• Medication guidance
• Diet and exercise advice
• Mental health support
• General medical information

Please feel free to describe how you're feeling or ask any health-related questions.`,
          isBot: true,
          timestamp: new Date(),
          type: 'quick_replies',
          quickReplies: [
            "😊 I'm feeling well",
            "😐 Not feeling great",
            "🤒 Have symptoms",
            "❓ Health question",
            "📋 Start assessment"
          ]
        };

        setMessages(prev => [...prev, greetingResponse]);
        setIsTyping(false);
        return;
      }

      // Handle quick reply selections
      if (text.includes('Start Health Assessment')) {
        const conditionsSection = (convertedProfile.conditions && convertedProfile.conditions.length > 0)
          ? `• Conditions: ${convertedProfile.conditions.join(', ')}`
          : '';
        
        const medicationsSection = (convertedProfile.medications && convertedProfile.medications.length > 0)
          ? `• Medications: ${convertedProfile.medications.map((m: any) => m.name).join(', ')}`
          : '';
          
        const assessmentResponse: Message = {
          id: Date.now().toString(),
          text: `I'll help you with a comprehensive health assessment. Based on your profile, let's focus on what's most relevant for you.

Current Health Overview:
• Blood Pressure: ${convertedMetrics.bloodPressureSystolic}/${convertedMetrics.bloodPressureDiastolic}
• Heart Rate: ${convertedMetrics.heartRate} BPM
• Weight: ${convertedMetrics.weight} kg
${conditionsSection}
${medicationsSection}

Please tell me about any specific concerns or symptoms you're experiencing.`,
          isBot: true,
          timestamp: new Date(),
          type: 'quick_replies',
          quickReplies: [
            "🤒 Describe Symptoms",
            "💊 Review Medications",
            "🏃‍♂️ Discuss Lifestyle",
            "👨‍👩‍👦 Family History",
            "📝 General Health"
          ]
        };

        setMessages(prev => [...prev, assessmentResponse]);
        setIsTyping(false);
        return;
      }

      // For all other messages, use the AI response with real patient data
      const response = await generateResponse(
        text,
        convertedProfile,
        convertedMetrics,
        convertedSymptoms,
        messages
      );

      setIsEmergencyMode(response.isEmergency);
      setMessages(prev => [...prev, ...response.messages]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I apologize for the technical difficulty. Please try rephrasing your question, or let me know if you'd like to start a health assessment.",
        isBot: true,
        timestamp: new Date(),
        type: 'quick_replies',
        quickReplies: [
          "🔄 Try Again",
          "📋 New Assessment",
          "👨‍⚕️ Contact Support",
          "❓ Ask Differently",
          "🏥 Emergency Help"
        ]
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      await handleSendMessage(input);
      setInput('');
    }
  };

  const handleQuickReply = async (reply: string) => {
    await handleSendMessage(reply);
  };

  const handleEmergencyCall = () => {
    window.location.href = "tel:911";
  };

  const handleDoctorCall = () => {
    window.location.href = "tel:+1234567890"; // Replace with actual doctor's number
  };

  // If data is not ready, show loading animation
  if (!dataReady && isLoading) {
    return (
      <div className="h-full min-h-[400px] flex items-center justify-center">
        <LoadingAnimation text="INITIALIZING AI" />
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.div
        className={`backdrop-blur-md bg-white/5 border rounded-xl overflow-hidden p-6 transition-all duration-300 ${
          isEmergencyMode ? 'border-red-500 shadow-red-900/50' : 'border-white/10 shadow-xl'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FaHeart className={`w-5 h-5 ${isEmergencyMode ? 'text-red-500 animate-heartbeat' : 'text-white'}`} />
            <h2 className="text-xl font-semibold text-white">Health Guardian AI</h2>
          </div>
        </div>
        
        <div className="flex flex-col h-[600px]">
          {/* Emergency Mode Banner */}
          <AnimatePresence>
            {isEmergencyMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-900/30 border border-red-500/30 text-white px-4 py-3 rounded-lg mb-4 flex items-center"
              >
                <FaExclamationTriangle className="text-red-500 mr-2" />
                <div className="flex-1">
                  <p className="font-medium">Emergency mode activated</p>
                  <p className="text-sm text-gray-300">If this is a life-threatening emergency, please call emergency services immediately.</p>
                </div>
                <div className="flex space-x-2">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleEmergencyCall}
                    className="bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    <FaPhone className="mr-1" /> Emergency
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDoctorCall}
                    className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    <FaPhone className="mr-1" /> Doctor
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4 mb-4 custom-scrollbar bg-black/30 backdrop-blur-md rounded-lg">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChatMessage 
                    message={message}
                    onQuickReplyClick={handleQuickReply}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-lg shadow-sm max-w-[80%] border border-white/10">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse delay-150"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Area */}
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-white/20 rounded-full bg-white/5 backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 placeholder-gray-400"
            />
            <motion.button
              type="submit"
              disabled={!input.trim()}
              whileHover={input.trim() ? { scale: 1.05 } : undefined}
              whileTap={input.trim() ? { scale: 0.95 } : undefined}
              className={`p-2 rounded-full ${
                input.trim()
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              } transition-colors duration-300`}
            >
              <FaPaperPlane className="w-5 h-5" />
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
