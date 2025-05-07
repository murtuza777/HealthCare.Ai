import { Message, Symptom, HealthProfile, HealthMetrics } from './types';
import { isEmergencySymptom, generateHealthTips } from './healthUtils';
import { assessHealthStatus } from './healthApi';
import { analyzeHealthData } from './healthAnalysis';

interface ChatResponse {
  messages: Message[];
  isEmergency: boolean;
}

function calculateHealthRisks(profile: HealthProfile, metrics: HealthMetrics): string[] {
  const risks: string[] = [];
  
  // Blood pressure risk assessment
  if (metrics.bloodPressureSystolic > 140 || metrics.bloodPressureDiastolic > 90) {
    risks.push('elevated blood pressure');
  }
  
  // Heart rate risk assessment
  if (metrics.heartRate > 100) {
    risks.push('elevated heart rate');
  }
  
  // Cholesterol risk assessment
  if (metrics.cholesterol > 200) {
    risks.push('elevated cholesterol');
  }

  // Lifestyle-based risks
  if (profile.lifestyle.smoker) {
    risks.push('smoking-related health risks');
  }
  
  if (profile.lifestyle.alcoholConsumption === 'heavy') {
    risks.push('alcohol-related health risks');
  }
  
  if (profile.lifestyle.exerciseFrequency < 3) {
    risks.push('insufficient physical activity');
  }

  return risks;
}

function getPreventiveRecommendations(risks: string[], profile: HealthProfile): string[] {
  const recommendations: string[] = [];
  
  risks.forEach(risk => {
    switch (risk) {
      case 'elevated blood pressure':
        recommendations.push(
          '• Consider the DASH diet (rich in fruits, vegetables, and low-fat dairy)',
          '• Limit sodium intake to less than 2,300mg per day',
          '• Regular blood pressure monitoring'
        );
        break;
      case 'elevated heart rate':
        recommendations.push(
          '• Practice stress-reduction techniques like deep breathing or meditation',
          '• Maintain regular sleep schedule',
          '• Consider discussing beta blockers with your primary care physician'
        );
        break;
      case 'elevated cholesterol':
        recommendations.push(
          '• Increase fiber intake through whole grains and legumes',
          '• Choose lean proteins and limit saturated fats',
          '• Consider regular cholesterol monitoring'
        );
        break;
      case 'smoking-related health risks':
        recommendations.push(
          '• Consider smoking cessation programs or nicotine replacement therapy',
          '• Join support groups for quitting smoking',
          '• Schedule regular lung function tests'
        );
        break;
      case 'insufficient physical activity':
        recommendations.push(
          '• Start with 10-minute walking sessions, gradually increasing duration',
          '• Find physical activities you enjoy to make exercise sustainable',
          '• Consider working with a fitness professional'
        );
        break;
    }
  });

  return recommendations;
}

function getLifestyleAdvice(profile: HealthProfile): string[] {
  const advice: string[] = [];
  
  // Exercise recommendations
  if (profile.lifestyle.exerciseFrequency < 5) {
    advice.push('Consider gradually increasing your exercise frequency to 5 days per week, starting with activities you enjoy.');
  }
  
  // Stress management
  if (profile.lifestyle.stressLevel > 6) {
    advice.push('Your stress levels appear elevated. Consider incorporating stress-reduction techniques such as meditation, yoga, or regular exercise.');
  }
  
  // Diet recommendations
  if (profile.lifestyle.diet === 'poor' || !profile.lifestyle.diet) {
    advice.push('Consider consulting with a nutritionist to develop a balanced meal plan that fits your lifestyle.');
  }

  return advice;
}

function getMedicationAdvice(profile: HealthProfile): string {
  if (!profile.medications || profile.medications.length === 0) {
    return '';
  }

  return `Regarding your medications (${profile.medications.map(m => m.name).join(', ')}), 
  ensure you're taking them as prescribed. Set reminders if needed, and always consult your doctor before making any changes.`;
}

export async function generateResponse(
  userMessage: string,
  healthProfile: HealthProfile | null,
  healthMetrics: HealthMetrics | null,
  symptoms: Symptom[],
  messageHistory: Message[]
): Promise<ChatResponse> {
  // In a real application, this would call an AI service
  // For development, we'll use mock responses based on user input
  
  // Default response
  let response: ChatResponse = {
    messages: [
      {
        id: Date.now().toString(),
        text: "I'm analyzing your health data to provide personalized guidance. How else can I assist you today?",
        isBot: true,
        timestamp: new Date(),
        type: 'text'
      }
    ],
    isEmergency: false
  };
  
  // Check for emergency keywords
  const emergencyKeywords = ['emergency', 'pain', 'chest pain', 'severe', 'attack', 'breathing', 'can\'t breathe'];
  const isEmergency = emergencyKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  
  if (isEmergency) {
    response = {
      messages: [
        {
          id: Date.now().toString(),
          text: "Based on what you've described, this may require immediate medical attention. Please contact emergency services (911/999/112) or go to the nearest emergency room right away.",
          isBot: true,
          timestamp: new Date(),
          type: 'emergency',
          metadata: {
            riskLevel: 'high',
            actions: [
              { type: 'call', details: 'emergency' }
            ]
          }
        }
      ],
      isEmergency: true
    };
  }
  // Check for medicine-related questions
  else if (userMessage.toLowerCase().includes('medicine') || userMessage.toLowerCase().includes('medication')) {
    if (healthProfile && healthProfile.medications.length > 0) {
      const medicationList = healthProfile.medications.map(med => 
        `${med.name} (${med.dosage}, ${med.frequency}, ${med.timeOfDay.join(', ')})`
      ).join('\n• ');
      
      response = {
        messages: [
          {
            id: Date.now().toString(),
            text: `Your current medications are:\n\n• ${medicationList}\n\nRemember to take your medications as prescribed. Would you like me to set up reminders for any of these medications?`,
            isBot: true,
            timestamp: new Date(),
            type: 'quick_replies',
            quickReplies: ['Set Medication Reminders', 'Side Effects Information', 'Medication Schedule']
          }
        ],
        isEmergency: false
      };
    } else {
      response = {
        messages: [
          {
            id: Date.now().toString(),
            text: "I don't see any medications listed in your health profile. Would you like to add your current medications?",
            isBot: true,
            timestamp: new Date(),
            type: 'quick_replies',
            quickReplies: ['Add Medications', 'Not Taking Any Medications']
          }
        ],
        isEmergency: false
      };
    }
  }
  // Check for exercise-related questions
  else if (userMessage.toLowerCase().includes('exercise') || userMessage.toLowerCase().includes('activity')) {
    response = {
      messages: [
        {
        id: Date.now().toString(),
          text: `Based on your health profile, I recommend ${healthProfile?.lifestyle?.exerciseFrequency === 0 ? 'starting with' : 'maintaining'} at least 150 minutes of moderate-intensity exercise per week.\n\nSome suitable activities might include:\n• Walking\n• Swimming\n• Cycling\n• Low-impact aerobics\n\nWould you like a personalized exercise plan?`,
        isBot: true,
        timestamp: new Date(),
        type: 'quick_replies',
          quickReplies: ['Get Exercise Plan', 'Exercise Benefits', 'Recommend Activities']
        }
      ],
      isEmergency: false
    };
  }
  // Check for diet-related questions
  else if (userMessage.toLowerCase().includes('diet') || userMessage.toLowerCase().includes('food') || userMessage.toLowerCase().includes('eat')) {
    let dietRecommendation = "A balanced diet is essential for heart health. ";
    
    if (healthProfile?.hasHeartCondition || (healthMetrics?.bloodPressureSystolic !== undefined && healthMetrics.bloodPressureSystolic > 130)) {
      dietRecommendation += "I recommend the DASH or Mediterranean diet, which emphasizes:\n• Vegetables, fruits, and whole grains\n• Lean proteins like fish and poultry\n• Limited red meat and processed foods\n• Reduced sodium intake";
    } else {
      dietRecommendation += "For general health, focus on:\n• Plenty of fruits and vegetables\n• Whole grains\n• Lean proteins\n• Healthy fats from sources like olive oil and avocados\n• Limited processed foods and added sugars";
    }
    
    response = {
      messages: [
        {
        id: Date.now().toString(),
          text: dietRecommendation + "\n\nWould you like more specific dietary recommendations?",
        isBot: true,
        timestamp: new Date(),
          type: 'quick_replies',
          quickReplies: ['Detailed Diet Plan', 'Heart-Healthy Foods', 'Foods to Avoid']
        }
      ],
      isEmergency: false
    };
  }
  // Check for symptom-related questions
  else if (userMessage.toLowerCase().includes('symptom') || userMessage.toLowerCase().includes('feeling')) {
    if (symptoms.length > 0) {
      const recentSymptoms = symptoms.slice(0, 3).map(s => 
        `• ${s.type} (${s.severity}/10, ${s.duration} minutes, ${new Date(s.timestamp).toLocaleDateString()})`
      ).join('\n');
      
      response = {
        messages: [
          {
            id: Date.now().toString(),
            text: `I see you've reported these recent symptoms:\n\n${recentSymptoms}\n\nWould you like me to analyze these symptoms or would you like to report a new symptom?`,
            isBot: true,
            timestamp: new Date(),
            type: 'quick_replies',
            quickReplies: ['Analyze My Symptoms', 'Report New Symptom', 'Track Symptom History']
          }
        ],
        isEmergency: false
      };
    } else {
      response = {
        messages: [
          {
            id: Date.now().toString(),
            text: "I don't see any symptoms in your records. Would you like to report a new symptom?",
            isBot: true,
            timestamp: new Date(),
            type: 'quick_replies',
            quickReplies: ['Report New Symptom', 'I Feel Fine', 'General Health Check']
          }
        ],
        isEmergency: false
      };
    }
  }
  // General health assessment request
  else if (userMessage.toLowerCase().includes('health') || userMessage.toLowerCase().includes('assessment')) {
    if (healthProfile && healthMetrics) {
      let healthStatus = "";
      
      // Blood pressure assessment
      if (healthMetrics?.bloodPressureSystolic > 140 || healthMetrics?.bloodPressureDiastolic > 90) {
        healthStatus += "• Your blood pressure is elevated and needs attention.\n";
      } else {
        healthStatus += "• Your blood pressure is in a normal range.\n";
      }
      
      // Heart rate assessment
      if (healthMetrics?.heartRate > 100) {
        healthStatus += "• Your resting heart rate is elevated.\n";
      } else {
        healthStatus += "• Your heart rate is in a healthy range.\n";
      }
      
      // Cholesterol assessment
      if (healthMetrics?.cholesterol > 200) {
        healthStatus += "• Your cholesterol levels are above recommended levels.\n";
      } else {
        healthStatus += "• Your cholesterol levels are in a good range.\n";
      }
      
      response = {
        messages: [
          {
            id: Date.now().toString(),
            text: `Based on your latest health metrics:\n\n${healthStatus}\nWhat specific aspect of your health would you like to focus on?`,
            isBot: true,
            timestamp: new Date(),
            type: 'quick_replies',
            quickReplies: ['Heart Health', 'Blood Pressure', 'Cholesterol', 'Weight Management']
          }
        ],
        isEmergency: false
      };
    } else {
      response = {
        messages: [
          {
            id: Date.now().toString(),
            text: "To provide a health assessment, I'll need more information about your health profile and current metrics. Would you like to update your health profile now?",
            isBot: true,
            timestamp: new Date(),
            type: 'quick_replies',
            quickReplies: ['Update Health Profile', 'General Health Tips']
          }
        ],
      isEmergency: false
    };
  }
  }
  
  // Add a random delay to simulate AI processing
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  return response;
}

function formatDoctorResponse(analysis: string): string {
  // Add markdown formatting for better readability
  let formattedResponse = analysis;

  // Format any medical terms with emphasis
  formattedResponse = formattedResponse.replace(/\b([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\b(?=\s*\()/g, '**$1**');
  
  // Format measurements and values
  formattedResponse = formattedResponse.replace(/(\d+(?:\.\d+)?)\s*(mg|kg|mmHg|bpm|°C|°F)\b/gi, '**$1** $2');
  
  // Format warning signs with emoji
  formattedResponse = formattedResponse.replace(/warning signs?|red flags?|emergency|urgent|immediate/gi, '⚠️ $&');
  
  // Format recommendations and advice sections
  formattedResponse = formattedResponse.replace(
    /(recommendations?|advice|suggestions?|tips|guidelines):/gi,
    '**$1:**'
  );
  
  // Format next steps or follow-up
  formattedResponse = formattedResponse.replace(
    /(next steps?|follow-?up|action items?):/gi,
    '**$1:**'
  );

  // Ensure proper spacing
  formattedResponse = formattedResponse.replace(/\n\n+/g, '\n\n');
  
  return formattedResponse;
}

function formatMedicalRecommendations(recommendations: string[]): string {
  if (!recommendations.length) return '';

  return `**Personalized Medical Recommendations:**

${recommendations.map(rec => `• ${rec}`).join('\n')}

Please follow these recommendations carefully. If you have any questions or experience new symptoms, don't hesitate to ask me or contact your healthcare provider.`;
}

function formatMentalHealthSupport(suggestions: string[]): string {
  if (!suggestions.length) return '';

  return `**Mental Health & Wellness Support:**

I understand that managing your health can be challenging. Here are some supportive recommendations:

${suggestions.map(tip => `• ${tip}`).join('\n')}

Remember, your mental well-being is just as important as your physical health. I'm here to support you through your health journey.`;
}

function generateContextualQuickReplies(assessment: any): string[] {
  const replies: string[] = [];
  const riskLevel = assessment.riskLevel?.toLowerCase();
  const hasEmergency = assessment.needsEmergencyCare;
  const hasMentalHealthSuggestions = assessment.mentalHealthSuggestions?.length > 0;

  // Add context-aware replies based on the response content
  if (hasEmergency) {
    replies.push(
      '🚨 Get Emergency Help',
      '👨‍⚕️ Contact Doctor Now',
      '🏥 Find Nearest Hospital',
      '📞 Emergency Contacts',
      '❗ View Warning Signs'
    );
  } else if (riskLevel === 'high') {
    replies.push(
      '👨‍⚕️ Schedule Doctor Visit',
      '📊 Track Symptoms',
      '⚠️ View Precautions',
      '💊 Review Medications',
      '🔔 Set Health Reminders'
    );
  } else {
    const commonReplies = [
      '📋 More Details',
      '❓ Ask Follow-up',
      '📝 Health Summary',
      '👍 Got It',
      '🤔 Need Clarification'
    ];
    
    // Add specific replies based on the assessment
    if (assessment.recommendations?.length > 0) {
      replies.push('✅ View All Recommendations');
    }
    if (hasMentalHealthSuggestions) {
      replies.push('🧘‍♂️ Mental Health Support');
    }
    if (assessment.actions?.some((a: { type: string }) => a.type === 'medication')) {
      replies.push('💊 Medication Details');
    }
    if (assessment.actions?.some((a: { type: string }) => a.type === 'exercise')) {
      replies.push('🏃‍♂️ Exercise Plan');
    }
    if (assessment.actions?.some((a: { type: string }) => a.type === 'diet')) {
      replies.push('🥗 Diet Advice');
    }

    // Add remaining common replies to reach 5 options
    replies.push(...commonReplies.slice(0, 5 - replies.length));
  }

  // Ensure unique replies and limit to 5
  return Array.from(new Set(replies)).slice(0, 5);
}
