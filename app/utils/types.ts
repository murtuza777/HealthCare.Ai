export interface HealthMetrics {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  cholesterol: number;
  weight: number;
  lastUpdated: Date;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  isDoctor: boolean;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: string[];
  startDate: Date;
  endDate?: Date;
}

export interface Symptom {
  type: string;
  severity: number;
  timestamp: Date;
  description: string;
  duration: number;
  accompaniedBy: string[];
}

export interface HealthProfile {
  hasHeartCondition: boolean;
  hadHeartAttack: boolean;
  lastHeartAttack?: Date;
  medications: Medication[];
  allergies: string[];
  conditions: string[];
  familyHistory: string[];
  lifestyle: {
    smoker: boolean;
    alcoholConsumption: 'none' | 'light' | 'moderate' | 'heavy';
    exerciseFrequency: number;
    diet: string;
    stressLevel: number;
  };
}

export interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  type: 'text' | 'quick_replies' | 'emergency' | 'metrics' | 'assessment';
  quickReplies?: string[];
  metadata?: any;
}
