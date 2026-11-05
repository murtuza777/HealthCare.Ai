import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MedicalReport } from './types';

// Types for health data management
export interface HealthProfile {
  id?: string;
  user_id: string;
  age?: number;
  height?: number;
  weight?: number;
  has_heart_condition?: boolean;
  had_heart_attack?: boolean;
  last_heart_attack?: Date;
  allergies?: string[];
  conditions?: string[];
  family_history?: string[];
  lifestyle?: {
    smoker: boolean;
    alcoholConsumption: 'none' | 'light' | 'moderate' | 'heavy';
    exerciseFrequency: number;
    diet: string;
    stressLevel: number;
  };
  created_at?: Date;
  updated_at?: Date;
}

export interface HealthMetrics {
  id?: string;
  user_id: string;
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  cholesterol?: number;
  weight?: number;
  oxygen_saturation?: number;
  temperature?: number;
  recorded_at?: Date;
  created_at?: Date;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  birth_date?: Date;
  gender?: string;
}

export interface Medication {
  id?: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  start_date: Date;
  end_date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface Symptom {
  id?: string;
  user_id: string;
  type: string;
  severity: number;
  description?: string;
  duration?: number;
  accompanied_by?: string[];
  timestamp?: Date;
  created_at?: Date;
}

// Authentication and user management functions
export const getSupabaseClient = () => {
  return createClientComponentClient();
};

export const getCurrentUser = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    throw error;
  }
  
  return data.user;
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return data;
};

export const updateUserProfile = async (profile: Partial<UserProfile>): Promise<UserProfile | null> => {
  const supabase = getSupabaseClient();
  
  if (!profile.id) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    profile.id = userData.user.id;
  }
  
  const { data, error } = await supabase
    .from('patients')
    .update(profile)
    .eq('id', profile.id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
  
  return data;
};

// Health profile and metrics management
export const getHealthProfile = async (userId: string): Promise<HealthProfile | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('health_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching health profile:', error);
    return null;
  }
  
  return data;
};

export const updateHealthProfile = async (profile: Partial<HealthProfile>): Promise<HealthProfile | null> => {
  const supabase = getSupabaseClient();
  
  if (!profile.user_id) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    profile.user_id = userData.user.id;
  }
  
  const { data, error } = await supabase
    .from('health_profiles')
    .update({
      ...profile,
      updated_at: new Date()
    })
    .eq('user_id', profile.user_id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating health profile:', error);
    throw error;
  }
  
  return data;
};

export const getHealthMetrics = async (userId: string): Promise<HealthMetrics | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error) {
    console.error('Error fetching health metrics:', error);
    return null;
  }
  
  return data;
};

export const addHealthMetrics = async (metrics: Partial<HealthMetrics>): Promise<HealthMetrics | null> => {
  const supabase = getSupabaseClient();
  
  if (!metrics.user_id) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    metrics.user_id = userData.user.id;
  }
  
  const { data, error } = await supabase
    .from('health_metrics')
    .insert({
      ...metrics,
      recorded_at: new Date()
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error adding health metrics:', error);
    throw error;
  }
  
  return data;
};

// Medication management
export const getMedications = async (userId: string): Promise<Medication[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
    
  if (error) {
    console.error('Error fetching medications:', error);
    return [];
  }
  
  return data || [];
};

export const addMedication = async (medication: Partial<Medication>): Promise<Medication | null> => {
  const supabase = getSupabaseClient();
  
  if (!medication.user_id) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    medication.user_id = userData.user.id;
  }
  
  const { data, error } = await supabase
    .from('medications')
    .insert(medication)
    .select()
    .single();
    
  if (error) {
    console.error('Error adding medication:', error);
    throw error;
  }
  
  return data;
};

// Symptom tracking
export const getSymptoms = async (userId: string): Promise<Symptom[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('symptoms')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
    
  if (error) {
    console.error('Error fetching symptoms:', error);
    return [];
  }
  
  return data || [];
};

export const addSymptom = async (symptom: Partial<Symptom>): Promise<Symptom | null> => {
  const supabase = getSupabaseClient();
  
  if (!symptom.user_id) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    symptom.user_id = userData.user.id;
  }
  
  const { data, error } = await supabase
    .from('symptoms')
    .insert({
      ...symptom,
      timestamp: new Date()
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error adding symptom:', error);
    throw error;
  }
  
  return data;
};

// Export MedicalReport type
export type { MedicalReport }; 