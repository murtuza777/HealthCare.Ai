'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  HealthProfile,
  HealthMetrics,
  Symptom,
  getHealthProfile,
  getHealthMetrics,
  getSymptoms,
  updateHealthProfile,
  addHealthMetrics,
  addSymptom,
  getMedications,
  Medication,
  getSupabaseClient
} from '../utils/supabase';
import { MedicalReport } from '../utils/types';

// Define types for the updated schema
interface Vital {
  id: number;
  patient_id: string;
  blood_pressure: string;
  glucose: number;
  timestamp: Date;
}

interface Report {
  id: number;
  patient_id: string;
  file_url: string;
  type: string;
  diagnosis: string;
}

interface Message {
  id: number;
  patient_id: string;
  content: string;
  is_ai_response: boolean;
  timestamp: Date;
}

interface Reminder {
  id: number;
  patient_id: string;
  type: string;
  time: Date;
  is_completed: boolean;
}

interface PatientContextProps {
  healthProfile: HealthProfile | null;
  healthMetrics: HealthMetrics | null;
  symptoms: Symptom[];
  medications: Medication[];
  vitals: Vital[];
  reports: Report[];
  messages: Message[];
  reminders: Reminder[];
  medicalReports: MedicalReport[];
  isLoading: boolean;
  updateHealthProfile: (profile: Partial<HealthProfile>) => Promise<void>;
  updateHealthMetrics: (metrics: Partial<HealthMetrics>) => Promise<void>;
  addSymptom: (symptom: Partial<Symptom>) => Promise<void>;
  addVital: (vital: Omit<Vital, 'id' | 'patient_id'>) => Promise<void>;
  addReport: (report: Omit<Report, 'id' | 'patient_id'>) => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'patient_id' | 'timestamp'>) => Promise<void>;
  addReminder: (reminder: Omit<Reminder, 'id' | 'patient_id'>) => Promise<void>;
  addMedicalReport: (report: Partial<MedicalReport>) => Promise<void>;
  updateReminder: (id: number, isCompleted: boolean) => Promise<void>;
  refreshPatientData: () => Promise<void>;
  setHealthProfile: React.Dispatch<React.SetStateAction<HealthProfile | null>>;
  setHealthMetrics: React.Dispatch<React.SetStateAction<HealthMetrics | null>>;
}

const PatientContext = createContext<PatientContextProps>({
  healthProfile: null,
  healthMetrics: null,
  symptoms: [],
  medications: [],
  vitals: [],
  reports: [],
  messages: [],
  reminders: [],
  medicalReports: [],
  isLoading: true,
  updateHealthProfile: async () => {},
  updateHealthMetrics: async () => {},
  addSymptom: async () => {},
  addVital: async () => {},
  addReport: async () => {},
  addMessage: async () => {},
  addReminder: async () => {},
  addMedicalReport: async () => {},
  updateReminder: async () => {},
  refreshPatientData: async () => {},
  setHealthProfile: () => {},
  setHealthMetrics: () => {},
});

export const usePatient = () => useContext(PatientContext);

export const PatientProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getSupabaseClient();

  // Add a safety timeout to ensure we don't get stuck in loading state
  useEffect(() => {
    // Reset safety timeout whenever loading state changes
    if (!isLoading) return;
    
    console.log('PatientContext: Setting up safety timeout for loading state');
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('PatientContext: Safety timeout triggered - forcing loading to complete');
        
        // Set reasonable defaults if data wasn't loaded
        if (!healthProfile && user) {
          console.log('PatientContext: Creating default health profile after timeout');
          setHealthProfile({
            user_id: user.id,
            age: 30,
            height: 170,
            weight: 70
          } as any);
          
          setHealthMetrics({
            user_id: user.id,
            heart_rate: 75,
            blood_pressure_systolic: 120,
            blood_pressure_diastolic: 80,
            weight: 70,
            glucose: 5.5,
            recorded_at: new Date()
          } as any);
        }
        
        setIsLoading(false);
      }
    }, 8000); // 8 seconds should be enough
    
    return () => clearTimeout(safetyTimeout);
  }, [isLoading, user, healthProfile]);

  // Wait for auth to be ready before fetching patient data
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        console.log('PatientContext: Auth is ready, user is authenticated. Fetching patient data...');
        refreshPatientData();
      } else {
        console.log('PatientContext: Auth is ready, no user authenticated. Setting loading to false.');
        setIsLoading(false);
      }
    } else {
      console.log('PatientContext: Auth still loading, waiting...');
    }
  }, [authLoading, user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to vitals table
    const vitalsSubscription = supabase
      .channel('vitals-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'vitals',
          filter: `patient_id=eq.${user.id}` 
        },
        (payload) => {
          console.log('Vitals change received!', payload);
          if (payload.eventType === 'INSERT') {
            setVitals(prev => [payload.new as Vital, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setVitals(prev => prev.map(v => v.id === payload.new.id ? payload.new as Vital : v));
          } else if (payload.eventType === 'DELETE') {
            setVitals(prev => prev.filter(v => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to health profiles table
    const healthProfileSubscription = supabase
      .channel('healthprofile-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'health_profiles',
          filter: `user_id=eq.${user.id}` 
        },
        (payload) => {
          console.log('Health profile change received!', payload);
          if (payload.eventType === 'UPDATE') {
            setHealthProfile(payload.new as HealthProfile);
          }
        }
      )
      .subscribe();
      
    // Subscribe to health metrics table
    const healthMetricsSubscription = supabase
      .channel('healthmetrics-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'health_metrics',
          filter: `user_id=eq.${user.id}` 
        },
        (payload) => {
          console.log('Health metrics change received!', payload);
          if (payload.eventType === 'INSERT') {
            setHealthMetrics(payload.new as HealthMetrics);
          } else if (payload.eventType === 'UPDATE') {
            setHealthMetrics(payload.new as HealthMetrics);
          }
        }
      )
      .subscribe();
      
    // Subscribe to reports table
    const reportsSubscription = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reports',
          filter: `patient_id=eq.${user.id}` 
        },
        (payload) => {
          console.log('Reports change received!', payload);
          if (payload.eventType === 'INSERT') {
            setReports(prev => [payload.new as Report, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReports(prev => prev.map(r => r.id === payload.new.id ? payload.new as Report : r));
          } else if (payload.eventType === 'DELETE') {
            setReports(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();
      
    // Subscribe to messages table
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `patient_id=eq.${user.id}` 
        },
        (payload) => {
          console.log('Messages change received!', payload);
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [payload.new as Message, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();
      
    // Subscribe to reminders table
    const remindersSubscription = supabase
      .channel('reminders-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reminders',
          filter: `patient_id=eq.${user.id}` 
        },
        (payload) => {
          console.log('Reminders change received!', payload);
          if (payload.eventType === 'INSERT') {
            setReminders(prev => [payload.new as Reminder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReminders(prev => prev.map(r => r.id === payload.new.id ? payload.new as Reminder : r));
          } else if (payload.eventType === 'DELETE') {
            setReminders(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(vitalsSubscription);
      supabase.removeChannel(reportsSubscription);
      supabase.removeChannel(messagesSubscription);
      supabase.removeChannel(remindersSubscription);
      supabase.removeChannel(healthProfileSubscription);
      supabase.removeChannel(healthMetricsSubscription);
    };
  }, [user, supabase]);

  // Fetch patient data when user is available
  useEffect(() => {
    const fetchPatientData = async () => {
      if (authLoading) {
        console.log('PatientContext: Auth still loading, waiting...');
        return; // Don't do anything while auth is still loading
      }

      if (!user) {
        console.log('PatientContext: User not available, skipping data fetch');
        setIsLoading(false);
        return;
      }

      console.log('PatientContext: Starting to fetch patient data for user:', user.id);
      setIsLoading(true);

      try {
        // Fetch patient profile data (adapted to new schema)
        console.log('PatientContext: Fetching patient profile');
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (patientError) {
          console.error('PatientContext: Error fetching patient profile:', patientError);
          // Create a default profile if it doesn't exist
          if (patientError.code === 'PGRST116') { // No rows returned
            console.log('PatientContext: No patient profile found, creating default');
            const { data: newPatient, error: createError } = await supabase
              .from('patients')
              .insert([{ 
                id: user.id, 
                name: user.email, 
                age: 30, // Add default age
                height: 170, // Add default height
                created_at: new Date().toISOString() 
              }])
              .select()
              .single();
              
            if (createError) {
              console.error('PatientContext: Error creating default patient:', createError);
              throw createError;
            }
            setHealthProfile(newPatient as any);
          } else {
            throw patientError;
          }
        } else {
          setHealthProfile(patientData as any);
        }

        // Fetch latest vitals
        console.log('PatientContext: Fetching vitals');
        const { data: vitalsData, error: vitalsError } = await supabase
          .from('vitals')
          .select('*')
          .eq('patient_id', user.id)
          .order('timestamp', { ascending: false });
          
        if (vitalsError) {
          console.error('PatientContext: Error fetching vitals:', vitalsError);
          throw vitalsError;
        }
        setVitals(vitalsData || []);
        
        // Use latest vital as health metrics
        if (vitalsData && vitalsData.length > 0) {
          console.log('PatientContext: Setting health metrics from vitals');
          const latestVital = vitalsData[0];
          const bp = latestVital.blood_pressure ? latestVital.blood_pressure.split('/') : ['120', '80'];
          
          setHealthMetrics({
            user_id: user.id,
            heart_rate: 75, // Default if not available
            blood_pressure_systolic: parseInt(bp[0]) || 120,
            blood_pressure_diastolic: parseInt(bp[1]) || 80,
            weight: 70, // Default if not available
            glucose: latestVital.glucose,
            recorded_at: latestVital.timestamp ? new Date(latestVital.timestamp) : new Date()
          } as any);
        } else {
          // Set default health metrics if no vitals found
          console.log('PatientContext: No vitals found, setting default health metrics');
          setHealthMetrics({
            user_id: user.id,
            heart_rate: 75,
            blood_pressure_systolic: 120,
            blood_pressure_diastolic: 80,
            weight: 70,
            glucose: 5.5,
            recorded_at: new Date()
          } as any);
        }
        
        // Fetch reports
        console.log('PatientContext: Fetching reports');
        const { data: reportsData, error: reportsError } = await supabase
          .from('reports')
          .select('*')
          .eq('patient_id', user.id);
          
        if (reportsError) {
          console.error('PatientContext: Error fetching reports:', reportsError);
          throw reportsError;
        }
        setReports(reportsData || []);
        
        // Fetch medical reports
        console.log('PatientContext: Fetching medical reports');
        const { data: medicalReportsData, error: medicalReportsError } = await supabase
          .from('medical_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
          
        if (medicalReportsError) {
          if (medicalReportsError.code === '42P01' || medicalReportsError.message?.includes('Table') || medicalReportsError.message?.includes('not found')) {
            console.error('PatientContext: medical_reports table not found. Please create it with the following SQL:');
            console.error(`
CREATE TABLE medical_reports (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  type VARCHAR(255) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  doctor VARCHAR(255),
  facility VARCHAR(255),
  findings TEXT,
  recommendations TEXT,
  follow_up BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_medical_reports_user_id ON medical_reports(user_id);
            `);
          } else {
            console.error('PatientContext: Error fetching medical reports:', medicalReportsError);
          }
          // Don't throw, continue with empty array
          setMedicalReports([]);
        } else {
          // Convert the data to the MedicalReport type
          const convertedReports: MedicalReport[] = (medicalReportsData || []).map(report => ({
            type: report.type || '',
            date: new Date(report.date),
            doctor: report.doctor || '',
            facility: report.facility || '',
            findings: report.findings || '',
            recommendations: report.recommendations || '',
            follow_up: report.follow_up || false,
            follow_up_date: report.follow_up_date ? new Date(report.follow_up_date) : null
          }));
          setMedicalReports(convertedReports);
        }
        
        // Fetch messages
        console.log('PatientContext: Fetching messages');
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('patient_id', user.id)
          .order('timestamp', { ascending: false });
          
        if (messagesError) {
          console.error('PatientContext: Error fetching messages:', messagesError);
          throw messagesError;
        }
        setMessages(messagesData || []);
        
        // Fetch reminders
        console.log('PatientContext: Fetching reminders');
        const { data: remindersData, error: remindersError } = await supabase
          .from('reminders')
          .select('*')
          .eq('patient_id', user.id)
          .order('time', { ascending: true });
          
        if (remindersError) {
          console.error('PatientContext: Error fetching reminders:', remindersError);
          throw remindersError;
        }
        setReminders(remindersData || []);
        
        console.log('PatientContext: Successfully loaded all patient data');
      } catch (error) {
        console.error('PatientContext: Error fetching patient data:', error);
        // Still set some reasonable defaults even if there's an error
        setHealthProfile(null);
        setHealthMetrics(null);
        setVitals([]);
        setReports([]);
        setMessages([]);
        setReminders([]);
        setMedicalReports([]);
      } finally {
        console.log('PatientContext: Setting isLoading to false');
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [user, authLoading, supabase]);

  // Update health profile
  const handleUpdateHealthProfile = async (profile: Partial<HealthProfile>) => {
    if (!user) return;

    try {
      // We need to cast profile as any since it seems like we're using HealthProfile to update UserProfile fields
      const { data, error } = await supabase
        .from('patients')
        .update({
          // These are properties from UserProfile, not HealthProfile
          name: (profile as any).name,
          birth_date: (profile as any).birth_date,
          gender: (profile as any).gender,
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      setHealthProfile(data as any);
    } catch (error) {
      console.error('Error updating health profile:', error);
      throw error;
    }
  };

  // Add new vital record
  const addVital = async (vital: Omit<Vital, 'id' | 'patient_id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vitals')
        .insert([
          {
            patient_id: user.id,
            ...vital,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Update health metrics based on latest vital
      const bp = vital.blood_pressure ? vital.blood_pressure.split('/') : ['120', '80'];
      setHealthMetrics({
        user_id: user.id,
        heart_rate: 75, // Default
        blood_pressure_systolic: parseInt(bp[0]) || 120,
        blood_pressure_diastolic: parseInt(bp[1]) || 80,
        weight: 70, // Default
        glucose: vital.glucose,
        recorded_at: vital.timestamp ? new Date(vital.timestamp) : new Date()
      } as any);
    } catch (error) {
      console.error('Error adding vital:', error);
      throw error;
    }
  };

  // Add new report
  const addReport = async (report: Omit<Report, 'id' | 'patient_id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([
          {
            patient_id: user.id,
            ...report,
          },
        ])
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Error adding report:', error);
      throw error;
    }
  };

  // Add new message
  const addMessage = async (message: Omit<Message, 'id' | 'patient_id' | 'timestamp'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            patient_id: user.id,
            ...message,
            timestamp: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  };

  // Add new reminder
  const addReminder = async (reminder: Omit<Reminder, 'id' | 'patient_id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert([
          {
            patient_id: user.id,
            ...reminder,
          },
        ])
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  };

  // Update reminder (mark as completed)
  const updateReminder = async (id: number, isCompleted: boolean) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .update({ is_completed: isCompleted })
        .eq('id', id)
        .eq('patient_id', user.id)
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  };

  // Legacy methods needed for compatibility
  const handleUpdateHealthMetrics = async (metrics: Partial<HealthMetrics>) => {
    if (!user) return;
    
    try {
      // Convert from HealthMetrics format to vitals format
      const bp = `${metrics.blood_pressure_systolic || 120}/${metrics.blood_pressure_diastolic || 80}`;
      
      await addVital({
        blood_pressure: bp,
        glucose: 5.5, // Default value
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating health metrics:', error);
      throw error;
    }
  };

  // Legacy method
  const handleAddSymptom = async (symptom: Partial<Symptom>) => {
    if (!user) return;
    // Store as a message
    try {
      await addMessage({
        content: `Symptom reported: ${symptom.type}, Severity: ${symptom.severity}${symptom.description ? `, Description: ${symptom.description}` : ''}`,
        is_ai_response: false
      });
    } catch (error) {
      console.error('Error adding symptom:', error);
      throw error;
    }
  };

  // Refresh all patient data
  const refreshPatientData = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Fetch patient profile data (adapted to new schema)
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (patientError) throw patientError;
      setHealthProfile(patientData as any);

      // Fetch latest vitals
      const { data: vitalsData, error: vitalsError } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', user.id)
        .order('timestamp', { ascending: false });
        
      if (vitalsError) throw vitalsError;
      setVitals(vitalsData);
      
      // Use latest vital as health metrics
      if (vitalsData.length > 0) {
        const latestVital = vitalsData[0];
        const bp = latestVital.blood_pressure ? latestVital.blood_pressure.split('/') : ['120', '80'];
        
        setHealthMetrics({
          user_id: user.id,
          heart_rate: 75, // Default if not available
          blood_pressure_systolic: parseInt(bp[0]) || 120,
          blood_pressure_diastolic: parseInt(bp[1]) || 80,
          weight: 70, // Default if not available
          glucose: latestVital.glucose,
          recorded_at: latestVital.timestamp ? new Date(latestVital.timestamp) : new Date()
        } as any);
      }
      
      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('patient_id', user.id);
        
      if (reportsError) throw reportsError;
      setReports(reportsData);
      
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('patient_id', user.id)
        .order('timestamp', { ascending: false });
        
      if (messagesError) throw messagesError;
      setMessages(messagesData);
      
      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .eq('patient_id', user.id)
        .order('time', { ascending: true });
        
      if (remindersError) throw remindersError;
      setReminders(remindersData);
    } catch (error) {
      console.error('Error refreshing patient data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add medical report
  const addMedicalReport = async (report: Partial<MedicalReport>) => {
    if (!user) return;

    try {
      // Convert the MedicalReport type to the database schema
      const dbReport = {
        user_id: user.id,
        type: report.type,
        date: report.date?.toISOString(),
        doctor: report.doctor,
        facility: report.facility,
        findings: report.findings,
        recommendations: report.recommendations,
        follow_up: report.follow_up,
        follow_up_date: report.follow_up_date?.toISOString()
      };

      const { data, error } = await supabase
        .from('medical_reports')
        .insert([dbReport])
        .select()
        .single();

      if (error) throw error;
      
      // Convert the response to the MedicalReport type
      const newReport: MedicalReport = {
        type: data.type || '',
        date: new Date(data.date),
        doctor: data.doctor || '',
        facility: data.facility || '',
        findings: data.findings || '',
        recommendations: data.recommendations || '',
        follow_up: data.follow_up || false,
        follow_up_date: data.follow_up_date ? new Date(data.follow_up_date) : null
      };
      
      setMedicalReports(prev => [newReport, ...prev]);
    } catch (error) {
      console.error('Error adding medical report:', error);
      throw error;
    }
  };

  return (
    <PatientContext.Provider
      value={{
        healthProfile,
        healthMetrics,
        symptoms,
        medications,
        vitals,
        reports,
        messages,
        reminders,
        medicalReports,
        isLoading,
        updateHealthProfile: handleUpdateHealthProfile,
        updateHealthMetrics: handleUpdateHealthMetrics,
        addSymptom: handleAddSymptom,
        addVital,
        addReport,
        addMessage,
        addReminder,
        addMedicalReport,
        updateReminder,
        refreshPatientData,
        setHealthProfile,
        setHealthMetrics,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}; 