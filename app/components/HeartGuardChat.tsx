'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaHeart } from 'react-icons/fa';
import ChatMessage from './ChatMessage';

interface Message {
  text: string;
  isBot: boolean;
}

const INITIAL_MESSAGE = `Hello! I'm your HeartGuard AI assistant. I can help you with:

1. Post-heart attack recovery guidance
2. Heart attack prevention strategies
3. Risk assessment and predictions
4. Lifestyle recommendations

What would you like to know about?`;

const SAMPLE_RESPONSES: { [key: string]: string } = {
  recovery: `Here's your post-heart attack recovery plan:

1. **Medication Management**
   - Take prescribed medications regularly
   - Keep track of side effects
   - Don't skip doses

2. **Physical Activity**
   - Start with short walks
   - Gradually increase activity
   - Follow cardiac rehabilitation program

3. **Lifestyle Changes**
   - Quit smoking
   - Maintain a heart-healthy diet
   - Manage stress levels

4. **Regular Monitoring**
   - Track blood pressure
   - Monitor heart rate
   - Record any symptoms

Would you like more specific information about any of these areas?`,

  prevention: `Here are key strategies for preventing heart attacks:

1. **Healthy Diet**
   - Reduce saturated fats
   - Increase fruits and vegetables
   - Limit salt intake
   - Choose whole grains

2. **Regular Exercise**
   - Aim for 150 minutes/week
   - Include cardio activities
   - Add strength training
   - Stay active daily

3. **Lifestyle Habits**
   - Maintain healthy weight
   - Quit smoking
   - Limit alcohol
   - Manage stress

4. **Regular Check-ups**
   - Monitor blood pressure
   - Check cholesterol levels
   - Track blood sugar
   - Annual heart screenings

Would you like more details about any of these prevention strategies?`,

  risk: `I'll help assess your heart attack risk factors:

**Common Risk Factors:**
1. High blood pressure
2. High cholesterol
3. Smoking
4. Obesity
5. Diabetes
6. Family history
7. Age and gender
8. Physical inactivity

Would you like to:
1. Learn more about any risk factor
2. Get a basic risk assessment
3. Receive personalized prevention tips

Please let me know your choice!`,
};

export default function HeartGuardChat() {
  const [messages, setMessages] = useState<Message[]>([
    { text: INITIAL_MESSAGE, isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setIsTyping(true);

    // Simulate AI response based on keywords
    setTimeout(() => {
      let response = '';
      const lowerInput = userMessage.toLowerCase();

      if (lowerInput.includes('recovery') || lowerInput.includes('after heart attack')) {
        response = SAMPLE_RESPONSES.recovery;
      } else if (lowerInput.includes('prevent') || lowerInput.includes('prevention')) {
        response = SAMPLE_RESPONSES.prevention;
      } else if (lowerInput.includes('risk') || lowerInput.includes('chance')) {
        response = SAMPLE_RESPONSES.risk;
      } else {
        response = "I understand you're asking about heart health. Could you please specify if you'd like information about:\n\n1. Post-heart attack recovery\n2. Heart attack prevention\n3. Risk assessment";
      }

      setMessages(prev => [...prev, { text: response, isBot: true }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Chat Header */}
      <div className="flex items-center space-x-2 p-4 border-b">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <FaHeart className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">HeartGuard AI Assistant</h3>
          <p className="text-sm text-gray-500">Always here to help</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message.text}
              isBot={message.isBot}
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
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <FaPaperPlane className="w-5 h-5" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
