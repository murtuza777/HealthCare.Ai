import { Message, Symptom, HealthProfile, HealthMetrics, MedicalReport } from './types';
import { isEmergencySymptom, generateHealthTips } from './healthUtils';
import { assessHealthStatus } from './healthApi';
import { analyzeHealthData } from './healthAnalysis';
import { getHealthAssistantResponse } from './healthAssistant';

interface ChatResponse {
  messages: Message[];
  isEmergency: boolean;
}

interface MedicalReportResponse {
  medicalReports: MedicalReport[];
  messageHistory: Message[];
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

// Add special handling for lifestyle discussions
async function handleLifestyleQuestions(
  healthProfile: HealthProfile | null,
  healthMetrics: HealthMetrics | null
): Promise<ChatResponse> {
  // Prepare lifestyle recommendations based on profile
  const exerciseLevel = healthProfile?.lifestyle?.exerciseFrequency || 0;
  const dietQuality = healthProfile?.lifestyle?.diet || 'unknown';
  const isSmoker = healthProfile?.lifestyle?.smoker || false;
  const stressLevel = healthProfile?.lifestyle?.stressLevel || 5;
  const alcoholConsumption = healthProfile?.lifestyle?.alcoholConsumption || 'moderate';
  
  // Check blood pressure for cardiovascular risk
  let cardiovascularRisk = "low";
  if (healthMetrics) {
    if (healthMetrics.bloodPressureSystolic > 140 || healthMetrics.bloodPressureDiastolic > 90) {
      cardiovascularRisk = "high";
    } else if (healthMetrics.bloodPressureSystolic > 130 || healthMetrics.bloodPressureDiastolic > 80) {
      cardiovascularRisk = "moderate";
    }
  }
  
  // Generate appropriate advice
  const exerciseAdvice = exerciseLevel < 3 
    ? "Your current exercise level is below recommendations. Aim for at least 150 minutes of moderate activity per week. Start with activities you enjoy like walking, swimming, or cycling."
    : "You're doing well with regular exercise! Maintain your routine of activity " + exerciseLevel + " times per week, and consider adding variety with both cardio and strength training.";
  
  const dietAdvice = dietQuality === 'poor' 
    ? "Your diet could use improvement. Focus on adding more fruits, vegetables, whole grains, and lean proteins while reducing processed foods, added sugars, and saturated fats."
    : "Continue maintaining a balanced diet. Ensure you're getting plenty of colorful vegetables, adequate protein, healthy fats, and staying hydrated throughout the day.";
  
  const cardiovascularAdvice = cardiovascularRisk === "high"
    ? "With your current blood pressure readings, it's especially important to limit sodium intake, maintain a healthy weight, and follow the DASH diet (rich in fruits, vegetables, and low-fat dairy)."
    : "Maintain heart health by staying physically active, managing stress, and including heart-healthy foods like fatty fish, nuts, olive oil, and plenty of fruits and vegetables.";
  
  const stressAdvice = stressLevel > 6
    ? "Your stress levels appear elevated. Consider incorporating daily stress-reduction practices like meditation, deep breathing, yoga, or mindfulness exercises."
    : "Continue managing stress effectively. Regular relaxation techniques, adequate sleep, and physical activity all contribute to emotional wellbeing.";
  
  const smokingAdvice = isSmoker
    ? "Quitting smoking would significantly improve your health across all measures. Consider speaking with your healthcare provider about cessation strategies and support resources."
    : "Maintaining your non-smoking status is one of the best things you can do for your long-term health.";
  
  const alcoholAdvice = alcoholConsumption === 'heavy'
    ? "Your alcohol consumption may be negatively impacting your health. Consider reducing intake to no more than 1 drink per day for women or 2 drinks per day for men."
    : "If you consume alcohol, continue to do so in moderation (no more than 1 drink per day for women or 2 drinks per day for men).";
  
  // Combine advice into a comprehensive response
  const lifestyleResponse: Message = {
    id: Date.now().toString(),
    text: `Based on your health profile, here are personalized lifestyle recommendations:

**Exercise:** ${exerciseAdvice}

**Nutrition:** ${dietAdvice}

**Heart Health:** ${cardiovascularAdvice}

**Stress Management:** ${stressAdvice}

${isSmoker ? `**Smoking:** ${smokingAdvice}\n\n` : ''}
${alcoholConsumption === 'heavy' ? `**Alcohol:** ${alcoholAdvice}\n\n` : ''}

A balanced lifestyle approach includes:
• Regular physical activity: 150 minutes moderate or 75 minutes vigorous activity weekly
• Balanced nutrition: plenty of fruits, vegetables, lean proteins, and whole grains
• Adequate sleep: 7-9 hours of quality sleep nightly
• Stress management: regular relaxation activities and mindfulness
• Social connections: maintaining meaningful relationships
• Mental stimulation: engaging in learning and creative activities

Would you like more specific recommendations for any area of your lifestyle?`,
    isBot: true,
    timestamp: new Date(),
    type: 'quick_replies',
    quickReplies: [
      "Exercise Recommendations",
      "Nutrition Guidance",
      "Sleep Improvement",
      "Stress Management",
      "Mental Wellbeing"
    ]
  };

  return {
    messages: [lifestyleResponse],
    isEmergency: false
  };
}

export async function generateResponse(
  userMessage: string,
  healthProfile: HealthProfile | null,
  healthMetrics: HealthMetrics | null,
  symptoms: Symptom[],
  medicalReports: MedicalReport[] = [],
  messageHistory: Message[]
): Promise<ChatResponse> {
  try {
    // Call the AI API route instead of directly using the function
    console.log("Calling AI API route with message:", userMessage);
    
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: userMessage,
        profile: healthProfile,
        metrics: healthMetrics,
        symptoms: symptoms,
        medicalReports: medicalReports,
        messageHistory: messageHistory
      })
    });
    
    if (!response.ok) {
      // Handle API errors and try to extract error details or fallback response
      const errorData = await response.json() as {
        error?: string;
        details?: string;
        fallbackResponse?: {
          answer: string;
          isEmergency: boolean;
          riskLevel: 'low' | 'medium' | 'high';
          recommendations: string[];
          preventiveAdvice: string[];
          followUpQuestions: string[];
        }
      };
      
      console.error("API response error:", errorData);
      
      // If there's a fallback response provided, use it
      if (errorData.fallbackResponse) {
        const aiResponse = errorData.fallbackResponse;
        const responseMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          text: aiResponse.answer,
          isBot: true,
          timestamp: new Date(),
          type: 'text'
        };
        
        if (aiResponse.followUpQuestions && aiResponse.followUpQuestions.length > 0) {
          responseMessage.type = 'quick_replies';
          responseMessage.quickReplies = aiResponse.followUpQuestions;
        }
        
        return {
          messages: [responseMessage],
          isEmergency: aiResponse.isEmergency
        };
      }
      
      throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }
    
    const aiResponse = await response.json() as {
      answer: string;
      isEmergency: boolean;
      riskLevel: 'low' | 'medium' | 'high';
      recommendations: string[];
      preventiveAdvice: string[];
      followUpQuestions: string[];
    };
    
    console.log("AI response received from API");
    
    // Process AI response into chat messages
    const responseMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      text: aiResponse.answer,
      isBot: true,
      timestamp: new Date(),
      type: 'text'
    };
    
    // Add quick replies if they exist in the response
    if (aiResponse.followUpQuestions && aiResponse.followUpQuestions.length > 0) {
      responseMessage.type = 'quick_replies';
      responseMessage.quickReplies = aiResponse.followUpQuestions;
    }
    
    return {
      messages: [responseMessage],
      isEmergency: aiResponse.isEmergency
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in generateResponse:', error);
    
    // Special handling for lifestyle questions if API fails
    if (userMessage.toLowerCase().includes('lifestyle') || 
        userMessage.toLowerCase().includes('exercise') || 
        userMessage.toLowerCase().includes('diet')) {
      try {
        return await handleLifestyleQuestions(healthProfile, healthMetrics);
      } catch (fallbackError) {
        console.error('Fallback error in handleLifestyleQuestions:', fallbackError);
      }
    }
    
    // Return a graceful error message
    return {
      messages: [
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          text: "I'm having trouble connecting to my knowledge base right now. Please try again in a moment or ask me a different question.",
          isBot: true,
          timestamp: new Date(),
          type: 'quick_replies',
          quickReplies: [
            "🔄 Try Again",
            "📋 Health Assessment",
            "❓ General Health Question",
            "💊 Medication Info",
            "🏥 Find Healthcare"
          ]
        }
      ],
      isEmergency: false
    };
  }
}

// Add new helper functions for health assessment and lab results

// Helper function for health assessment
async function handleHealthAssessment(
  healthProfile: HealthProfile | null,
  healthMetrics: HealthMetrics | null,
  medicalReports: MedicalReport[] = []
): Promise<ChatResponse> {
  const conditionsSection = (healthProfile?.conditions && healthProfile.conditions.length > 0)
    ? `• Conditions: ${healthProfile.conditions.join(', ')}`
    : '';
  
  const medicationsSection = (healthProfile?.medications && healthProfile.medications.length > 0)
    ? `• Medications: ${healthProfile.medications.map(m => `${m.name} (${m.dosage})`).join(', ')}`
    : '';
  
  // Include recent lab values or report findings if available
  const recentReportSection = (medicalReports && medicalReports.length > 0)
    ? `\n• Recent ${medicalReports[0].type}: ${new Date(medicalReports[0].date).toLocaleDateString()} - ${medicalReports[0].findings.substring(0, 100)}...`
    : '';
    
  const assessmentResponse: Message = {
    id: Date.now().toString(),
    text: `I'll help you with a comprehensive health assessment. Based on your profile, let's focus on what's most relevant for you.

Current Health Overview:
• Blood Pressure: ${healthMetrics?.bloodPressureSystolic || 'N/A'}/${healthMetrics?.bloodPressureDiastolic || 'N/A'}
• Heart Rate: ${healthMetrics?.heartRate || 'N/A'} BPM
• Weight: ${healthMetrics?.weight || 'N/A'} kg
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

  return {
    messages: [assessmentResponse],
    isEmergency: false
  };
}

// Helper function for lab results
async function handleLabResults(medicalReports: MedicalReport[] = []): Promise<ChatResponse> {
  if (medicalReports && medicalReports.length > 0) {
    const reportsOverview = medicalReports.slice(0, 3).map((report, index) => 
      `${index + 1}. ${report.type} (${new Date(report.date).toLocaleDateString()}) - ${report.facility}`
    ).join('\n');
    
    const reportsResponse: Message = {
      id: Date.now().toString(),
      text: `I can help explain your medical reports. Here are your most recent reports:\n\n${reportsOverview}\n\nWhich report would you like me to explain in detail?`,
      isBot: true,
      timestamp: new Date(),
      type: 'quick_replies',
      quickReplies: [
        ...medicalReports.slice(0, 5).map(report => `${report.type} (${new Date(report.date).toLocaleDateString()})`),
        '📋 All Reports Summary'
      ]
    };
    
    return {
      messages: [reportsResponse],
      isEmergency: false
    };
  } else {
    const noReportsResponse: Message = {
      id: Date.now().toString(),
      text: "I don't see any medical reports or lab results in your records. Would you like to upload a new report for my analysis?",
      isBot: true,
      timestamp: new Date(),
      type: 'quick_replies',
      quickReplies: ['Upload New Report', 'Ask Another Question']
    };
    
    return {
      messages: [noReportsResponse],
      isEmergency: false
    };
  }
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

// Helper function to simplify medical reports for patients
function simplifyMedicalReport(report: MedicalReport): string {
  // A real implementation would have more sophisticated natural language processing
  // This is a simplified version for demonstration
  
  const simplifiedText = report.findings
    .replace(/(\d+\.\d+)/g, (match: string) => `<b>${match}</b>`) // Bold all numeric values
    .replace(/elevated/gi, '<b>elevated</b>') // Bold key terms
    .replace(/normal/gi, '<b>normal</b>')
    .replace(/abnormal/gi, '<b>abnormal</b>')
    .split('\n')
    .map((line: string) => {
      // Add explanations for common medical terms
      if (line.toLowerCase().includes('ldl')) {
        return `${line} (This is your "bad" cholesterol - lower is better)`;
      }
      if (line.toLowerCase().includes('hdl')) {
        return `${line} (This is your "good" cholesterol - higher is better)`;
      }
      if (line.toLowerCase().includes('triglycerides')) {
        return `${line} (These are fats in your blood - lower is better)`;
      }
      if (line.toLowerCase().includes('a1c')) {
        return `${line} (This shows your average blood sugar over 3 months)`;
      }
      return line;
    })
    .join('\n');
  
  return simplifiedText;
}

// Helper function to interpret report in context of patient's health profile
function interpretReportForPatient(report: MedicalReport, profile: HealthProfile | null, metrics: HealthMetrics | null): string {
  // This would be more sophisticated in a real implementation
  
  let interpretation = '';
  
  // Look for patterns or relationships between report and health conditions
  if (profile?.hasHeartCondition && report.type.toLowerCase().includes('cardiac')) {
    interpretation = 'areas that need attention given your heart condition history';
  } else if (profile?.lifestyle?.smoker && (report.type.toLowerCase().includes('lung') || report.type.toLowerCase().includes('respiratory'))) {
    interpretation = 'some areas to monitor given your smoking history';
  } else {
    interpretation = 'your current health status with some areas to maintain and others to improve';
  }
  
  return interpretation;
}

// Helper function to extract key insights from a medical report
function extractKeyInsightsFromReport(report: MedicalReport): string {
  // In a real implementation, this would use NLP to extract the most important findings
  
  // For demo purposes, just return the first sentence or first 100 characters
  const firstSentence = report.findings.split('.')[0];
  return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
}

// Helper function to interpret blood pressure
function interpretBloodPressure(systolic?: number, diastolic?: number): string {
  if (!systolic || !diastolic) return "within normal range based on default values";
  
  if (systolic < 120 && diastolic < 80) {
    return "within normal range";
  } else if ((systolic >= 120 && systolic <= 129) && diastolic < 80) {
    return "elevated";
  } else if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return "in the Stage 1 hypertension range";
  } else if (systolic >= 140 || diastolic >= 90) {
    return "in the Stage 2 hypertension range";
  } else if (systolic > 180 || diastolic > 120) {
    return "in the hypertensive crisis range - please seek immediate medical attention";
  }
  
  return "within normal range";
}

// Define default health profiles for when user data is missing
const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  name: "User",
  age: 35,
  height: 170,
  weight: 70,
  hasHeartCondition: false,
  hadHeartAttack: false,
  medications: [],
  allergies: [],
  conditions: [],
  familyHistory: [],
  lifestyle: {
    smoker: false,
    alcoholConsumption: 'light',
    exerciseFrequency: 2,
    diet: 'mixed',
    stressLevel: 5
  }
};

const DEFAULT_HEALTH_METRICS: HealthMetrics = {
  heartRate: 70,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  cholesterol: 180,
  weight: 70,
  lastUpdated: new Date()
};
