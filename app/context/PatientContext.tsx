'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HealthProfile, HealthMetrics, Symptom } from '../utils/types';

interface PatientContextType {
  healthProfile: HealthProfile | null;
  healthMetrics: HealthMetrics | null;
  symptoms: Symptom[];
  updateHealthProfile: (profile: HealthProfile) => Promise<void>;
  updateHealthMetrics: (metrics: HealthMetrics) => Promise<void>;
  addSymptom: (symptom: Symptom) => Promise<void>;
  removeSymptom: (symptomId: string) => Promise<void>;
  clearSymptoms: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

interface PatientApiResponse {
  id: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  hasHeartCondition: boolean;
  hadHeartAttack: boolean;
  lastHeartAttack?: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    timeOfDay: string;
    startDate: string;
    endDate?: string;
  }[];
  details: {
    allergies?: string;
    conditions?: string;
    familyHistory?: string;
    smoker: boolean;
    alcoholConsumption: "none" | "light" | "moderate" | "heavy";
    exerciseFrequency: number;
    diet: string;
    stressLevel: number;
  };
  healthMetrics?: {
    heartRate: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    cholesterol: number;
    weight: number;
    recordedAt: string;
  }[];
  symptoms?: {
    type: string;
    severity: string;
    recordedAt: string;
    description: string;
    duration: string;
    accompaniedBy?: string;
  }[];
}

export function PatientProvider({ children }: { children: ReactNode }) {
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load patient data on mount
  useEffect(() => {
    loadPatientData();
  }, []);

  async function loadPatientData() {
    try {
      setIsLoading(true);
      setError(null);

      // In a real app, you would get the patient ID from authentication
      const patientId = 'current-user-id';
      const response = await fetch(`/api/patients?id=${patientId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load patient data');
      }

      const data = (await response.json()) as PatientApiResponse;
      
      // Transform the data into our expected format
      setHealthProfile({
        name: data.name,
        age: data.age,
        height: data.height,
        weight: data.weight,
        hasHeartCondition: data.hasHeartCondition,
        hadHeartAttack: data.hadHeartAttack,
        lastHeartAttack: data.lastHeartAttack ? new Date(data.lastHeartAttack) : undefined,
        medications: data.medications.map((med) => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          timeOfDay: JSON.parse(med.timeOfDay),
          startDate: new Date(med.startDate),
          endDate: med.endDate ? new Date(med.endDate) : undefined,
        })),
        allergies: JSON.parse(data.details.allergies || '[]'),
        conditions: JSON.parse(data.details.conditions || '[]'),
        familyHistory: JSON.parse(data.details.familyHistory || '[]'),
        lifestyle: {
          smoker: data.details.smoker,
          alcoholConsumption: data.details.alcoholConsumption,
          exerciseFrequency: data.details.exerciseFrequency,
          diet: data.details.diet,
          stressLevel: data.details.stressLevel,
        },
      });

      // Get the latest metrics
      if (data.healthMetrics?.[0]) {
        const metrics = data.healthMetrics[0];
        setHealthMetrics({
          heartRate: metrics.heartRate,
          bloodPressureSystolic: metrics.bloodPressureSystolic,
          bloodPressureDiastolic: metrics.bloodPressureDiastolic,
          cholesterol: metrics.cholesterol,
          weight: metrics.weight,
          lastUpdated: new Date(metrics.recordedAt),
        });
      }

      // Get recent symptoms
      if (data.symptoms) {
        setSymptoms(data.symptoms.map((s: any) => ({
          type: s.type,
          severity: s.severity,
          timestamp: new Date(s.recordedAt),
          description: s.description,
          duration: s.duration,
          accompaniedBy: JSON.parse(s.accompaniedBy || '[]'),
        })));
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
      setError('Failed to load patient data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }

  const updateHealthProfile = async (profile: HealthProfile) => {
    try {
      setError(null);
      const patientId = 'current-user-id'; // In a real app, get from auth
      
      const response = await fetch(`/api/patients?id=${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          healthMetrics: healthMetrics,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setHealthProfile(profile);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
      throw error;
    }
  };

  const updateHealthMetrics = async (metrics: HealthMetrics) => {
    try {
      setError(null);
      const patientId = 'current-user-id'; // In a real app, get from auth
      
      const response = await fetch(`/api/patients?id=${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...healthProfile,
          healthMetrics: metrics,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update metrics');
      }

      setHealthMetrics(metrics);
    } catch (error) {
      console.error('Error updating metrics:', error);
      setError('Failed to update metrics. Please try again.');
      throw error;
    }
  };

  const addSymptom = async (symptom: Symptom) => {
    try {
      setError(null);
      const patientId = 'current-user-id'; // In a real app, get from auth
      
      const response = await fetch(`/api/patients/${patientId}/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(symptom),
      });

      if (!response.ok) {
        throw new Error('Failed to add symptom');
      }

      setSymptoms(prev => [...prev, symptom]);
    } catch (error) {
      console.error('Error adding symptom:', error);
      setError('Failed to add symptom. Please try again.');
      throw error;
    }
  };

  const removeSymptom = async (symptomId: string) => {
    try {
      setError(null);
      const patientId = 'current-user-id'; // In a real app, get from auth
      
      const response = await fetch(`/api/patients/${patientId}/symptoms/${symptomId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove symptom');
      }

      setSymptoms(prev => prev.filter(s => s.type !== symptomId));
    } catch (error) {
      console.error('Error removing symptom:', error);
      setError('Failed to remove symptom. Please try again.');
      throw error;
    }
  };

  const clearSymptoms = async () => {
    try {
      setError(null);
      const patientId = 'current-user-id'; // In a real app, get from auth
      
      const response = await fetch(`/api/patients/${patientId}/symptoms`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear symptoms');
      }

      setSymptoms([]);
    } catch (error) {
      console.error('Error clearing symptoms:', error);
      setError('Failed to clear symptoms. Please try again.');
      throw error;
    }
  };

  return (
    <PatientContext.Provider
      value={{
        healthProfile,
        healthMetrics,
        symptoms,
        updateHealthProfile,
        updateHealthMetrics,
        addSymptom,
        removeSymptom,
        clearSymptoms,
        isLoading,
        error,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
} 