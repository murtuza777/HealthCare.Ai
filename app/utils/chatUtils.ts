import { Message, Symptom, HealthProfile, HealthMetrics } from './types';
import { isEmergencySymptom, generateHealthTips } from './healthUtils';
import { assessHealthStatus } from './healthApi';

interface ChatResponse {
  messages: Message[];
  isEmergency: boolean;
}

export async function generateResponse(
  userMessage: string,
  healthProfile: HealthProfile,
  currentMetrics: HealthMetrics,
  recentSymptoms: Symptom[],
  chatHistory: Message[]
): Promise<ChatResponse> {
  try {
    // Get AI health assessment
    const healthAssessment = await assessHealthStatus({
      profile: healthProfile,
      metrics: currentMetrics,
      symptoms: recentSymptoms,
      query: userMessage
    });

    const messages: Message[] = [];

    // Add main response message
    messages.push({
      id: Date.now().toString(),
      text: healthAssessment.analysis,
      isBot: true,
      timestamp: new Date(),
      type: healthAssessment.needsEmergencyCare ? 'emergency' : 'text',
      metadata: {
        riskLevel: healthAssessment.riskLevel,
        actions: healthAssessment.actions
      }
    });

    // If there are specific recommendations, add them as a separate message
    if (healthAssessment.recommendations.length > 0) {
      messages.push({
        id: (Date.now() + 1).toString(),
        text: '**Recommendations:**\n\n' + healthAssessment.recommendations.join('\n'),
        isBot: true,
        timestamp: new Date(),
        type: 'text'
      });
    }

    // Add quick reply options based on the context
    const quickReplies = generateQuickReplies(healthAssessment);
    if (quickReplies.length > 0) {
      messages.push({
        id: (Date.now() + 2).toString(),
        text: 'Would you like to:',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_replies',
        quickReplies
      });
    }

    return {
      messages,
      isEmergency: healthAssessment.needsEmergencyCare
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
        quickReplies: ['Call Doctor', 'View Emergency Contacts', 'Try Again']
      }],
      isEmergency: false
    };
  }
}

function generateQuickReplies(assessment: any): string[] {
  const replies: string[] = [];
  const riskLevel = assessment.riskLevel.toLowerCase();

  // Add risk-based replies
  if (riskLevel === 'high') {
    replies.push('Call Emergency', 'Contact Doctor', 'View Warning Signs');
  } else if (riskLevel === 'medium') {
    replies.push('Schedule Check-up', 'Monitor Symptoms', 'View Precautions');
  } else {
    replies.push('Track Progress', 'View Health Tips', 'Check Medications');
  }

  // Add action-based replies
  assessment.actions.forEach(action => {
    switch (action.type) {
      case 'medical_consultation':
        if (!replies.includes('Contact Doctor')) {
          replies.push('Contact Doctor');
        }
        break;
      case 'medication':
        if (!replies.includes('Check Medications')) {
          replies.push('Check Medications');
        }
        break;
      case 'exercise':
        replies.push('View Exercise Plan');
        break;
      case 'diet':
        replies.push('Diet Recommendations');
        break;
      case 'monitoring':
        replies.push('Track Vitals');
        break;
    }
  });

  return replies.slice(0, 5); // Limit to 5 options
}
