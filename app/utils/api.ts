import { HealthProfile, HealthMetrics, Symptom } from './types';

interface HeartGuardRequestData {
  userMessage: string;
  healthProfile: HealthProfile;
  currentMetrics: HealthMetrics;
  recentSymptoms: Symptom[];
  detectedTopics: string[];
  context: {
    lastHeartAttack?: Date;
    riskLevel: 'low' | 'medium' | 'high';
    medicationAdherence: number;
    lastCheckup?: Date;
  };
}

interface HeartGuardErrorResponse {
  error: string;
}

interface HeartGuardSuccessResponse {
  data: {
    response: {
      message: string;
      type: 'general' | 'emergency' | 'medication' | 'lifestyle' | 'risk';
      quickReplies?: string[];
      recommendations?: string[];
      actions?: {
        type: 'call_emergency' | 'call_doctor' | 'take_medication' | 'check_vitals';
        priority: 'high' | 'medium' | 'low';
        description: string;
      }[];
    };
    relevantData: {
      medications?: {
        name: string;
        nextDose: Date;
        instructions: string;
      }[];
      vitals?: {
        type: string;
        value: number;
        unit: string;
        status: 'normal' | 'warning' | 'critical';
      }[];
      riskFactors?: {
        factor: string;
        level: 'low' | 'medium' | 'high';
        recommendation: string;
      }[];
    };
  };
}

interface ExerciseRecommendation {
  type: string;
  duration: number;
  intensity: string;
  frequency: number;
  precautions: string[];
}

interface DietPlan {
  mealType: string;
  recommendations: string[];
  restrictions: string[];
  heartHealthyOptions: string[];
}

const API_BASE = process.env.NODE_ENV === 'development'
  ? '/api'
  : 'https://heartguard-ai.healthcareai.workers.dev/api';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export async function getAIRecommendations(data: HeartGuardRequestData) {
  try {
    console.log('Sending data to HeartGuard AI:', data);

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY || ''
      },
      body: JSON.stringify({
        message: data.userMessage,
        userData: {
          profile: data.healthProfile,
          metrics: data.currentMetrics,
          symptoms: data.recentSymptoms,
          context: data.context
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeartGuard AI error:', errorText);
      throw new Error(errorText || 'HeartGuard AI service error');
    }

    const result = await response.json();
    console.log('HeartGuard AI response:', result);

    return result;
  } catch (error) {
    console.error('Error calling HeartGuard AI:', error);
    throw error;
  }
}

export async function getExerciseRecommendations(profile: HealthProfile, metrics: HealthMetrics) {
  return fetchFromAI('/exercise-plan', { profile, metrics });
}

export async function getDietRecommendations(profile: HealthProfile, restrictions: string[]) {
  return fetchFromAI('/diet-plan', { profile, restrictions });
}

export async function getRiskAssessment(profile: HealthProfile, metrics: HealthMetrics, symptoms: Symptom[]) {
  return fetchFromAI('/risk-assessment', { profile, metrics, symptoms });
}

export async function getMedicationSchedule(profile: HealthProfile) {
  return fetchFromAI('/medication-schedule', { profile });
}

async function fetchFromAI(endpoint: string, data: any) {
  try {
    const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.slice(4) : endpoint;
    const response = await fetch(`${API_BASE}${cleanEndpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY || ''
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('HeartGuard AI service error');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}
