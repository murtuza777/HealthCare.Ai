'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaHeart, FaPhone, FaExclamationTriangle, FaClipboardList, FaHeartbeat, FaFileMedical } from 'react-icons/fa';
import ChatMessage from './ChatMessage';
import { Message } from '../utils/types';
import { generateResponse } from '../utils/chatUtils';
import { getExerciseRecommendations, getDietRecommendations, getRiskAssessment } from '../utils/api';
import { usePatient } from '../context/PatientContext';
import {
  HealthProfile as SupabaseHealthProfile,
  HealthMetrics as SupabaseHealthMetrics,
  Symptom as SupabaseSymptom,
  Medication as SupabaseMedication,
  MedicalReport as SupabaseMedicalReport
} from '../utils/supabase';
import LoadingAnimation from './LoadingAnimation';
import GeminiApiTester from './GeminiApiTester';

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

// New function to convert medical reports
const convertMedicalReports = (reports: SupabaseMedicalReport[]): any[] => {
  if (!reports || !Array.isArray(reports)) return [];
  
  return reports.map(report => ({
    type: report.type || '',
    date: report.date || new Date(),
    doctor: report.doctor || '',
    facility: report.facility || '',
    findings: report.findings || '',
    recommendations: report.recommendations || '',
    follow_up: report.follow_up || false,
    follow_up_date: report.follow_up_date || null
  }));
};

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  text: `Hello! I'm your Health Guardian AI assistant. I'm a specialized medical AI that can:

1. Answer ANY healthcare or medical question in detail
2. Analyze your personal health data and provide insights
3. Explain medical conditions, treatments, and terminology
4. Provide personalized health recommendations
5. Interpret your medical reports and lab results
6. Offer guidance on medications, diet, and exercise
7. Detect potential health risks based on your metrics
8. Answer general health queries like "what is cancer" or "how to prevent diabetes"

To get started, simply ask me any healthcare question or select from the suggested topics below.`,
  isBot: true,
  timestamp: new Date(),
  type: 'quick_replies',
  quickReplies: [
    '🏥 Start Health Assessment',
    '❓ How does this AI work?',
    '🧬 Explain a Medical Term',
    '💊 Medication Information',
    '📊 Analyze My Health Data'
  ]
};

// Function to check if a message is a greeting
const isGreeting = (text: string): boolean => {
  const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
  return greetings.some(greeting => text.toLowerCase().includes(greeting));
};

// Function to generate unique message IDs
const generateUniqueId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export default function HealthGuardianChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get real patient data from context
  const { healthProfile, healthMetrics, symptoms, medications, medicalReports, isLoading } = usePatient();
  
  // Convert Supabase models to local models for the AI chat functionality
  const convertedProfile = convertHealthProfile(healthProfile);
  const convertedMetrics = convertHealthMetrics(healthMetrics);
  const convertedSymptoms = convertSymptoms(symptoms);
  const convertedReports = convertMedicalReports(medicalReports);
  
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
  }, [isLoading, healthProfile, healthMetrics, symptoms, medications, medicalReports]);

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
          id: generateUniqueId(),
          text: "I'm still loading your health data. Please wait a moment or continue with general health questions.",
          isBot: true,
          timestamp: new Date(),
          type: 'quick_replies',
          quickReplies: ['❓ General Health', '🏥 Common Questions', '⏱️ Wait for Data']
        }]);
        return;
      }

      const userMessage: Message = {
        id: generateUniqueId(),
        text,
        isBot: false,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);

      // Handle greetings with personalized health status
      if (isGreeting(text)) {
        const bpStatus = convertedMetrics.bloodPressureSystolic && convertedMetrics.bloodPressureDiastolic ? 
          `${convertedMetrics.bloodPressureSystolic}/${convertedMetrics.bloodPressureDiastolic}` : 
          'not recorded';
        
        // Create a personalized greeting with health summary
        const greetingResponse: Message = {
          id: generateUniqueId(),
          text: `Hello! I'm your personalized Health Guardian AI assistant.

Based on your most recent data, your vital signs are:
• Blood Pressure: ${bpStatus} mmHg
• Heart Rate: ${convertedMetrics.heartRate || 'not recorded'} BPM
${convertedSymptoms.length > 0 ? `• Recent Symptoms: ${convertedSymptoms[0].type} (reported ${new Date(convertedSymptoms[0].timestamp).toLocaleDateString()})` : ''}
${convertedReports.length > 0 ? `• Latest Report: ${convertedReports[0].type} (${new Date(convertedReports[0].date).toLocaleDateString()})` : ''}

How can I help with your health today? I can analyze your data for insights, provide recommendations, or answer any medical questions.`,
          isBot: true,
          timestamp: new Date(),
          type: 'quick_replies',
          quickReplies: [
            '📊 Analyze My Health Trends',
            '🩺 Start Health Assessment',
            '🧪 Review Recent Lab Results',
            '🔍 Check For Health Risks',
            '💊 Medication Information'
          ]
        };
        
        setMessages(prev => [...prev, greetingResponse]);
        setIsTyping(false);
        return;
      }

      // Check for special quick replies that have dedicated handlers
      if (text === '🏥 Start Health Assessment' || text === '📋 Start assessment' || text === '🩺 Start Health Assessment') {
        await handleHealthAssessment();
        setIsTyping(false);
        return;
      }

      if (text === '📊 Explain Lab Results' || text === '🧪 Review Recent Lab Results' || text.toLowerCase().includes('explain lab') || text.toLowerCase().includes('lab results')) {
        await handleLabResults();
        setIsTyping(false);
        return;
      }

      if (text === '🔍 Check For Health Risks' || text.toLowerCase().includes('health risk') || text.toLowerCase().includes('disease risk')) {
        await handleRiskAssessment();
        setIsTyping(false);
        return;
      }

      // For all other messages, use the AI response with real patient data
      const response = await generateResponse(
        text,
        convertedProfile,
        convertedMetrics,
        convertedSymptoms,
        convertedReports,
        messages
      );

      setIsEmergencyMode(response.isEmergency);
      setMessages(prev => [...prev, ...response.messages]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
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
    // Special handling for 'Discuss Lifestyle' should use generateResponse
    if (reply === '🏃‍♂️ Discuss Lifestyle' || reply.toLowerCase().includes('lifestyle')) {
      await handleSendMessage(reply);
      return;
    }

    // Handle health assessment related replies
    if (reply === '📋 Start assessment' || reply === '🏥 Start Health Assessment' || reply === '🩺 Start Health Assessment') {
      await handleHealthAssessment();
      return;
    }
    
    // Handle lab results related replies
    if (reply === '📊 Explain Lab Results' || reply === '🧪 Review Recent Lab Results' || reply === '📑 Explain My Medical Reports') {
      await handleLabResults();
      return;
    }
    
    // Handle risk assessment related replies
    if (reply === '🔍 Check For Health Risks' || reply === '🔍 Check Disease Risk') {
      await handleRiskAssessment();
      return;
    }
    
    // Handle health data analysis
    if (reply === '📊 Analyze My Health Data' || reply === '📊 Analyze My Health Trends') {
      await handleHealthDataAnalysis();
      return;
    }
    
    // Handle medication review
    if (reply === '💊 Review My Medications' || reply === '💊 Medication Information') {
      await handleMedicationReview();
      return;
    }
    
    // For other replies, just send the message
    await handleSendMessage(reply);
  };

  // Handle health assessment
  const handleHealthAssessment = async () => {
    const conditionsSection = (convertedProfile.conditions && convertedProfile.conditions.length > 0)
      ? `• Conditions: ${convertedProfile.conditions.join(', ')}`
      : '';
    
    const medicationsSection = (convertedProfile.medications && convertedProfile.medications.length > 0)
      ? `• Medications: ${convertedProfile.medications.map((m: any) => m.name).join(', ')}`
      : '';
    
    // Include recent lab values or report findings if available
    const recentReportSection = (convertedReports && convertedReports.length > 0)
      ? `\n• Recent ${convertedReports[0].type}: ${new Date(convertedReports[0].date).toLocaleDateString()} - ${convertedReports[0].findings.substring(0, 100)}...`
      : '';
      
    const assessmentResponse: Message = {
      id: generateUniqueId(),
      text: `I'll help you with a comprehensive health assessment. Based on your profile, let's focus on what's most relevant for you.

Current Health Overview:
• Blood Pressure: ${convertedMetrics.bloodPressureSystolic}/${convertedMetrics.bloodPressureDiastolic}
• Heart Rate: ${convertedMetrics.heartRate} BPM
• Weight: ${convertedMetrics.weight} kg
${conditionsSection}
${medicationsSection}${recentReportSection}

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
  };

  // Handle lab results
  const handleLabResults = async () => {
    if (convertedReports && convertedReports.length > 0) {
      const reportsOverview = convertedReports.slice(0, 3).map((report, index) => 
        `${index + 1}. ${report.type} (${new Date(report.date).toLocaleDateString()}) - ${report.facility}`
      ).join('\n');
      
      const reportsResponse: Message = {
        id: generateUniqueId(),
        text: `I can help explain your medical reports. Here are your most recent reports:\n\n${reportsOverview}\n\nWhich report would you like me to explain in detail?`,
        isBot: true,
        timestamp: new Date(),
        type: 'quick_replies',
        quickReplies: [
          ...convertedReports.slice(0, 5).map(report => `${report.type} (${new Date(report.date).toLocaleDateString()})`),
          '📋 All Reports Summary'
        ]
      };
      
      setMessages(prev => [...prev, reportsResponse]);
    } else {
      const noReportsResponse: Message = {
        id: generateUniqueId(),
        text: "I don't see any medical reports or lab results in your records. Would you like to upload a new report for my analysis?",
        isBot: true,
        timestamp: new Date(),
        type: 'quick_replies',
        quickReplies: ['Upload New Report', 'Ask Another Question']
      };
      
      setMessages(prev => [...prev, noReportsResponse]);
    }
  };

  // Add risk assessment handler
  const handleRiskAssessment = async () => {
    // Calculate health risks based on health profile and metrics
    const risks: string[] = [];
    
    // Check blood pressure
    if (convertedMetrics.bloodPressureSystolic > 140 || convertedMetrics.bloodPressureDiastolic > 90) {
      risks.push('Hypertension risk (elevated blood pressure)');
    }
    
    // Check heart rate
    if (convertedMetrics.heartRate > 100) {
      risks.push('Tachycardia risk (elevated heart rate)');
    }
    
    // Check cholesterol
    if (convertedMetrics.cholesterol > 200) {
      risks.push('Hypercholesterolemia risk (elevated cholesterol)');
    }

    // Check lifestyle factors
    if (convertedProfile.lifestyle?.smoker) {
      risks.push('Smoking-related health risks (cardiovascular, respiratory)');
    }
    
    if (convertedProfile.lifestyle?.alcoholConsumption === 'heavy') {
      risks.push('Alcohol-related health risks (liver, cardiovascular)');
    }
    
    if (convertedProfile.lifestyle?.exerciseFrequency < 3) {
      risks.push('Insufficient physical activity (metabolic, cardiovascular)');
    }
    
    if (convertedProfile.weight && convertedProfile.height) {
      // Calculate BMI if height and weight are available
      const heightInMeters = convertedProfile.height / 100; // Convert cm to meters
      const bmi = convertedProfile.weight / (heightInMeters * heightInMeters);
      if (bmi >= 30) {
        risks.push('Obesity risk (BMI ≥ 30)');
      } else if (bmi >= 25) {
        risks.push('Overweight risk (BMI ≥ 25)');
      }
    }
    
    // Check for pre-existing conditions
    if (convertedProfile.conditions && convertedProfile.conditions.length > 0) {
      risks.push(`Ongoing management needed for: ${convertedProfile.conditions.join(', ')}`);
    }
    
    // Create risk assessment response
    const riskResponse: Message = {
      id: generateUniqueId(),
      text: risks.length > 0 ? 
        `Based on my analysis of your health data, I've identified these potential health risks that deserve attention:

${risks.map(risk => `• ${risk}`).join('\n')}

${convertedProfile.hadHeartAttack ? 'With your history of heart attack, careful monitoring of cardiovascular health is essential.' : ''}
${convertedProfile.hasHeartCondition ? 'Your heart condition requires ongoing attention to minimize complications.' : ''}

Would you like personalized recommendations to address these risks, or more information about any specific risk factor?` : 
        `Based on my analysis of your current health data, I haven't identified any significant health risks. Your metrics appear to be within normal ranges.

Keep in mind that this assessment is based only on the data available in your profile and doesn't replace a comprehensive medical evaluation.

Would you like information about preventive health measures to maintain your good health status?`,
      isBot: true,
      timestamp: new Date(),
      type: 'quick_replies',
      quickReplies: risks.length > 0 ? 
        [
          'Recommendations for Risks',
          'Explain Risk Factors',
          'Track Health Metrics',
          'Preventive Measures',
          'Discuss with Doctor'
        ] : 
        [
          'Preventive Health Tips',
          'Optimize Wellness',
          'Screening Recommendations',
          'Healthy Lifestyle',
          'Fitness Advice'
        ]
    };
    
    setMessages(prev => [...prev, riskResponse]);
  };

  // Add health data analysis handler
  const handleHealthDataAnalysis = async () => {
    // Get trends from health metrics if available
    const hasMetricsHistory = convertedMetrics && convertedMetrics.lastUpdated;
    
    const analysisResponse: Message = {
      id: generateUniqueId(),
      text: `Based on your health data, here's my analysis of your current health status and trends:

${convertedMetrics ? `Vital Signs Analysis:
• Blood Pressure: ${convertedMetrics.bloodPressureSystolic}/${convertedMetrics.bloodPressureDiastolic} mmHg - ${analyzeBP(convertedMetrics.bloodPressureSystolic, convertedMetrics.bloodPressureDiastolic)}
• Heart Rate: ${convertedMetrics.heartRate} BPM - ${convertedMetrics.heartRate > 100 ? 'Above normal range' : convertedMetrics.heartRate < 60 ? 'Below normal range' : 'Within normal range'}
• Cholesterol: ${convertedMetrics.cholesterol} mg/dL - ${convertedMetrics.cholesterol > 200 ? 'Above recommended levels' : 'Within recommended levels'}` : 'No current vital signs data available for analysis.'}

${convertedSymptoms.length > 0 ? `Recent Symptoms Analysis:
${convertedSymptoms.slice(0, 3).map(s => `• ${s.type} (Severity: ${s.severity}/10) - ${s.severity > 7 ? 'High severity, should be monitored closely' : s.severity > 4 ? 'Moderate severity, keep monitoring' : 'Low severity'}`).join('\n')}` : 'No recent symptoms recorded for analysis.'}

${convertedProfile.medications && convertedProfile.medications.length > 0 ? `Medication Analysis:
${convertedProfile.medications.slice(0, 3).map((m: any) => `• ${m.name} (${m.dosage}) - Taking as prescribed since ${new Date(m.startDate).toLocaleDateString()}`).join('\n')}` : 'No medications currently listed in your profile.'}

Health Trends:
${hasMetricsHistory ? 'Your metrics have been tracked since ' + new Date(convertedMetrics.lastUpdated).toLocaleDateString() : 'Not enough historical data to establish trends. Regular monitoring will help build this over time.'}

Would you like more detailed analysis of a specific aspect of your health data?`,
      isBot: true,
      timestamp: new Date(),
      type: 'quick_replies',
      quickReplies: [
        'Analyze Cardiovascular',
        'Analyze Symptoms',
        'Analyze Medications',
        'Track New Metrics',
        'Historical Trends'
      ]
    };
    
    setMessages(prev => [...prev, analysisResponse]);
  };
  
  // Add medication review handler
  const handleMedicationReview = async () => {
    const hasMedications = convertedProfile.medications && convertedProfile.medications.length > 0;
    
    const medicationResponse: Message = {
      id: generateUniqueId(),
      text: hasMedications ? 
        `Here's a review of your current medications:

${convertedProfile.medications.map((med: any, index: number) => 
  `${index + 1}. ${med.name} (${med.dosage})
   • Frequency: ${med.frequency}
   • Time of day: ${Array.isArray(med.timeOfDay) ? med.timeOfDay.join(', ') : 'Not specified'}
   • Started: ${med.startDate ? new Date(med.startDate).toLocaleDateString() : 'Date not recorded'}`
).join('\n\n')}

Would you like information about potential side effects, interactions, or adherence recommendations for any of these medications?` :
        `I don't see any medications listed in your health profile. 

Would you like to add your current medications to your profile for better personalized recommendations and medication management?`,
      isBot: true,
      timestamp: new Date(),
      type: 'quick_replies',
      quickReplies: hasMedications ? 
        [
          'Medication Side Effects',
          'Potential Interactions',
          'Adherence Tips',
          'Best Time to Take',
          'Add New Medication'
        ] : 
        [
          'Add Medications',
          'General Medication Tips',
          'Medication Safety',
          'Ask About a Medication',
          'Return to Dashboard'
        ]
    };
    
    setMessages(prev => [...prev, medicationResponse]);
  };
  
  // Helper function to analyze blood pressure
  const analyzeBP = (systolic: number, diastolic: number): string => {
    if (!systolic || !diastolic) return "Data incomplete";
    
    if (systolic >= 180 || diastolic >= 120) {
      return "Hypertensive crisis - requires immediate medical attention";
    } else if (systolic >= 140 || diastolic >= 90) {
      return "Stage 2 hypertension - consult with healthcare provider";
    } else if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
      return "Stage 1 hypertension - lifestyle changes recommended";
    } else if (systolic >= 120 && systolic < 130 && diastolic < 80) {
      return "Elevated - consider preventive measures";
    } else {
      return "Normal range";
    }
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
      {/* Display GeminiApiTester at the top */}
      <GeminiApiTester />
      
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
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Patient Overview"
            >
              <FaClipboardList className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Vitals"
            >
              <FaHeartbeat className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Medical Reports"
            >
              <FaFileMedical className="w-4 h-4" />
            </motion.button>
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
            <AnimatePresence initial={false} mode="sync">
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
