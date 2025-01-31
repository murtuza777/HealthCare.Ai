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
  healthProfile: HealthProfile,
  currentMetrics: HealthMetrics,
  recentSymptoms: Symptom[],
  chatHistory: Message[]
): Promise<ChatResponse> {
  try {
    // Analyze health data
    const healthRisks = calculateHealthRisks(healthProfile, currentMetrics);
    const preventiveRecommendations = getPreventiveRecommendations(healthRisks, healthProfile);
    const lifestyleAdvice = getLifestyleAdvice(healthProfile);
    const medicationAdvice = getMedicationAdvice(healthProfile);

    // Determine if this is a symptom-related query
    const isSymptomQuery = userMessage.toLowerCase().includes('symptom') || 
                          userMessage.toLowerCase().includes('feel') ||
                          userMessage.toLowerCase().includes('pain');

    // Determine if this is a medication-related query
    const isMedicationQuery = userMessage.toLowerCase().includes('medication') || 
                            userMessage.toLowerCase().includes('medicine') ||
                            userMessage.toLowerCase().includes('pill');

    // Determine if this is a lifestyle-related query
    const isLifestyleQuery = userMessage.toLowerCase().includes('exercise') || 
                            userMessage.toLowerCase().includes('diet') ||
                            userMessage.toLowerCase().includes('stress');

    let response = '';
    let quickReplies: string[] = [];
    let isEmergency = false;

    // Check for emergency symptoms
    const emergencySymptoms = recentSymptoms.some(s => 
      (s.type.includes('chest pain') && s.severity > 7) ||
      (s.type.includes('breathing') && s.severity > 8) ||
      (s.type.includes('unconscious'))
    );

    if (emergencySymptoms) {
      response = `⚠️ Based on your reported symptoms, I recommend immediate medical attention. Please contact emergency services or go to the nearest emergency room.

Key concerns:
${recentSymptoms.filter(s => s.severity > 7).map(s => `• ${s.type} (Severity: ${s.severity}/10)`).join('\n')}

While waiting for medical help:
• Stay calm and seated
• Take slow, deep breaths
• Have someone stay with you
• Have your medical history and medication list ready`;

      isEmergency = true;
      quickReplies = [
        '🚑 Call Emergency',
        '📍 Find ER',
        '❤️ Track Vitals',
        '📋 Show History',
        '👨‍⚕️ Contact Doctor'
      ];
    } else if (isSymptomQuery) {
      response = `Based on your symptoms and health profile, here's my assessment:

${recentSymptoms.map(s => `• ${s.type} (Severity: ${s.severity}/10): ${s.description}`).join('\n')}

Recommendations:
${preventiveRecommendations.join('\n')}

Lifestyle Modifications:
${lifestyleAdvice.join('\n')}

${medicationAdvice}

Continue monitoring your symptoms and schedule a follow-up with your primary care physician if they persist or worsen.`;

      quickReplies = [
        '🤒 Update Symptoms',
        '📊 Track Progress',
        '💊 Medication Help',
        '🏥 Find Doctor',
        '❓ More Info'
      ];
    } else if (isMedicationQuery) {
      response = `Regarding your medications:

${medicationAdvice}

Important reminders:
• Always take medications as prescribed
• Keep track of any side effects
• Don't skip doses
• Store medications properly
• Refill prescriptions on time

Would you like to:
• Set up medication reminders
• Learn about potential interactions
• Track side effects
• Schedule a medication review`;

      quickReplies = [
        '⏰ Set Reminders',
        '❗ Side Effects',
        '🔄 Refill Info',
        '📋 Med Review',
        '👨‍⚕️ Ask Doctor'
      ];
    } else if (isLifestyleQuery) {
      response = `Based on your health profile, here are personalized lifestyle recommendations:

Exercise:
• Current activity: ${healthProfile.lifestyle.exerciseFrequency} days/week
• Target: 5 days/week of moderate activity
• Start with activities you enjoy
• Gradually increase intensity

Diet:
• Focus on balanced meals
• Include plenty of fruits and vegetables
• Stay hydrated
• Monitor portion sizes

Stress Management:
• Practice relaxation techniques
• Maintain regular sleep schedule
• Consider mindfulness activities
• Take regular breaks

${healthRisks.length > 0 ? '\nHealth Risks to Address:\n' + healthRisks.map(risk => `• ${risk}`).join('\n') : ''}

Would you like a detailed plan for any of these areas?`;

      quickReplies = [
        '🏃‍♂️ Exercise Plan',
        '🥗 Diet Tips',
        '🧘‍♂️ Stress Help',
        '😴 Sleep Tips',
        '📊 Track Progress'
      ];
    } else {
      response = `I'm here to help you maintain optimal health. Based on your profile, here are key points to focus on:

Health Status:
• BP: ${currentMetrics.bloodPressureSystolic}/${currentMetrics.bloodPressureDiastolic}
• Heart Rate: ${currentMetrics.heartRate} BPM
• Cholesterol: ${currentMetrics.cholesterol} mg/dL

${healthRisks.length > 0 ? '\nAreas to Monitor:\n' + healthRisks.map(risk => `• ${risk}`).join('\n') : ''}

${preventiveRecommendations.length > 0 ? '\nRecommendations:\n' + preventiveRecommendations.join('\n') : ''}

How can I assist you today?`;

      quickReplies = [
        '🏥 Health Check',
        '💊 Medications',
        '🤒 Symptoms',
        '🥗 Lifestyle',
        '📋 Prevention'
      ];
    }

    return {
      messages: [{
        id: Date.now().toString(),
        text: response,
        isBot: true,
        timestamp: new Date(),
        type: 'quick_replies',
        quickReplies
      }],
      isEmergency
    };
  } catch (error) {
    console.error('Error generating response:', error);
    return {
      messages: [{
        id: Date.now().toString(),
        text: "I apologize, but I'm having trouble analyzing your health data right now. If you're experiencing any concerning symptoms, please contact your healthcare provider.",
        isBot: true,
        timestamp: new Date(),
        type: 'text',
        quickReplies: ['Contact Healthcare Provider', 'Try Again', 'Get Emergency Contacts']
      }],
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
  const riskLevel = assessment.riskLevel.toLowerCase();
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
