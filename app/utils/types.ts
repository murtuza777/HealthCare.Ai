export interface HealthMetrics {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  cholesterol: number;
  weight: number;
  lastUpdated: Date;
  vitalHistory?: Array<{
    timestamp: Date;
    heartRate: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    weight: number;
    cholesterol: number;
    oxygenSaturation: number;
    temperature: number;
  }>;
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
  name: string;
  age: number;
  height: number;
  weight: number;
  hasHeartCondition: boolean;
  hadHeartAttack: boolean;
  lastHeartAttack?: Date;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    timeOfDay: string[];
    startDate: Date;
  }>;
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
  type: 'text' | 'quick_replies' | 'emergency';
  quickReplies?: string[];
  metadata?: {
    riskLevel?: string;
    actions?: Array<{
      type: string;
      details: string;
    }>;
  };
}

export interface MedicalReport {
  type: string;
  date: Date;
  doctor: string;
  facility: string;
  findings: string;
  recommendations: string;
  follow_up: boolean;
  follow_up_date?: Date | null;
}
