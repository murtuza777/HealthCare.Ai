'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, Title, BarList, Button } from "@tremor/react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title as ChartTitle, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, subDays, parseISO } from 'date-fns';
import { FaHeartbeat, FaWeight, FaTint, FaChartLine, FaLungs, FaHospital, FaUserPlus, FaUserMd, FaClipboardList, FaHistory } from 'react-icons/fa';
import HealthMetricsCard from './HealthMetricsCard';
import HeartRiskAssessment from './HeartRiskAssessment';
import PatientDetailsForm, { PatientDetails } from './PatientDetailsForm';
import { analyzeHealthData } from '../utils/healthAnalysis';
import { usePatient } from '../context/PatientContext';
import LoadingAnimation from './LoadingAnimation';
import { motion } from 'framer-motion';

/**
 * PatientOverview Component
 * 
 * This component focuses on providing a rich, visual representation of patient health data.
 * It creates graphical displays of vital signs and health metrics, presenting them in an 
 * easy-to-understand dashboard format. This component loads patient data once and renders 
 * static visualizations rather than polling for real-time updates.
 * 
 * Features:
 * - Visual cards showing current health metrics (heart rate, blood pressure, etc.)
 * - Trend charts for various vital signs over time
 * - Health risk assessment visualization
 * - Personalized health advice based on current metrics
 * - Medication and symptom information display
 */

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

// Extended interfaces to add missing properties for TypeScript
interface ExtendedHealthProfile extends Record<string, any> {
  name?: string;
  age?: number;
  height?: number;
  weight?: number;
  has_heart_condition?: boolean;
  had_heart_attack?: boolean;
  last_heart_attack?: string | Date;
  medications?: any[];
  allergies?: string[];
  conditions?: string[];
  family_history?: string[];
  lifestyle?: {
    smoker?: boolean;
    alcoholConsumption?: string;
    exerciseFrequency?: number;
    diet?: string;
    stressLevel?: number;
    // Snake case versions for the DB
    alcohol_consumption?: string;
    exercise_frequency?: number;
    stress_level?: number;
  };
}

interface ExtendedHealthMetrics extends Record<string, any> {
  heart_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  cholesterol?: number;
  weight?: number;
  recorded_at?: string | Date;
  glucose?: number; // Added for glucose tracking
}

interface PatientOverviewProps {
  patientId: string;
}

// Helper function to safely analyze health data to handle type mismatches
const safeAnalyzeHealthData = (profile: ExtendedHealthProfile, metrics: ExtendedHealthMetrics) => {
  try {
    // Create correctly formatted objects from DB data
    const formattedProfile = {
      name: profile.name || '',
      age: profile.age || 30,
      height: profile.height || 170,
      weight: metrics.weight || 70,
      hasHeartCondition: profile.has_heart_condition || false,
      hadHeartAttack: profile.had_heart_attack || false,
      lastHeartAttack: profile.last_heart_attack ? new Date(profile.last_heart_attack) : undefined,
      medications: profile.medications || [],
      allergies: profile.allergies || [],
      conditions: profile.conditions || [],
      familyHistory: profile.family_history || [],
      lifestyle: {
        smoker: profile.lifestyle?.smoker || false,
        alcoholConsumption: profile.lifestyle?.alcohol_consumption || profile.lifestyle?.alcoholConsumption || 'light',
        exerciseFrequency: profile.lifestyle?.exercise_frequency || profile.lifestyle?.exerciseFrequency || 2,
        diet: profile.lifestyle?.diet || '',
        stressLevel: profile.lifestyle?.stress_level || profile.lifestyle?.stressLevel || 3
      }
    };

    const formattedMetrics = {
      heartRate: metrics.heart_rate || 75,
      bloodPressureSystolic: metrics.blood_pressure_systolic || 120,
      bloodPressureDiastolic: metrics.blood_pressure_diastolic || 80,
      cholesterol: metrics.cholesterol || 180,
      weight: metrics.weight || 70,
      lastUpdated: metrics.recorded_at ? new Date(metrics.recorded_at) : new Date()
    };

    return analyzeHealthData({
      ...formattedProfile,
      lifestyle: {
        ...formattedProfile.lifestyle,
        alcoholConsumption: formattedProfile.lifestyle.alcoholConsumption as "none" | "light" | "moderate" | "heavy"
      }
    }, formattedMetrics);
  } catch (error) {
    console.error("Error analyzing health data:", error);
    return {
      riskLevel: 'unknown',
      summary: 'Unable to analyze health data at this time.',
      factors: [],
      metrics: {}
    };
  }
};

export default function PatientOverview({ patientId }: PatientOverviewProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<any>(null);
  const [showPersonalizedAdvice, setShowPersonalizedAdvice] = useState(false);
  const [vitalHistory, setVitalHistory] = useState<any[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Cast to extended types to avoid TypeScript errors
  const { 
    healthProfile: baseHealthProfile, 
    healthMetrics: baseHealthMetrics, 
    vitals,
    symptoms, 
    updateHealthProfile, 
    updateHealthMetrics,
    refreshPatientData,
    setHealthProfile,
    setHealthMetrics
  } = usePatient();
  
  // Cast to extended interfaces to have access to all properties
  const healthProfile = baseHealthProfile as ExtendedHealthProfile;
  const healthMetrics = baseHealthMetrics as ExtendedHealthMetrics;

  // Initialize with patient data one time only
  useEffect(() => {
    const loadData = async () => {
      if (patientId && !healthProfile) {
        try {
          await refreshPatientData();
        } catch (err) {
          console.error("Error loading patient data:", err);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [patientId, healthProfile, refreshPatientData]);

  // Add an effect to auto-hide success toast after 5 seconds
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Update health analysis whenever patient data changes
  useEffect(() => {
    if (healthProfile && healthMetrics) {
      const analysis = safeAnalyzeHealthData(healthProfile, healthMetrics);
      setHealthAnalysis(analysis);
    }
  }, [healthProfile, healthMetrics]);

  // Process vitals data for charts (only once when data loads)
  useEffect(() => {
    if (vitals && vitals.length > 0) {
      // Convert from database format to chart format
      const processedVitals = vitals.map(vital => {
        const bp = vital.blood_pressure ? vital.blood_pressure.split('/') : ['120', '80'];
        return {
          timestamp: new Date(vital.timestamp),
          bloodPressureSystolic: parseInt(bp[0]) || 120,
          bloodPressureDiastolic: parseInt(bp[1]) || 80,
          glucose: vital.glucose || 5.5,
          // Add default values for other metrics that might not be in the vitals table
          heartRate: 75,
          weight: healthProfile?.weight || 70,
          oxygenSaturation: 98,
          temperature: 36.5
        };
      });
      
      // Sort by timestamp
      const sortedVitals = processedVitals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setVitalHistory(sortedVitals);
    }
  }, [vitals, healthProfile]);

  const handlePatientDetailsSubmit = async (details: PatientDetails) => {
    try {
      setLoading(true);

      // Convert form data to format expected by API
      const profileUpdate: any = {
        name: details.name,
        age: details.age,
        height: details.height,
        weight: details.weight,
        has_heart_condition: details.hasHeartCondition,
        had_heart_attack: details.hadHeartAttack,
        last_heart_attack: details.lastHeartAttack,
        allergies: details.allergies.split(',').map(a => a.trim()),
        conditions: details.conditions.split(',').map(c => c.trim()),
        family_history: details.familyHistory.split(',').map(h => h.trim()),
        lifestyle: {
          smoker: details.smoker,
          alcohol_consumption: details.alcoholConsumption,
          exercise_frequency: Number(details.exerciseFrequency),
          diet: details.diet,
          stress_level: Number(details.stressLevel),
        },
      };

      // Add new vital with current metrics
      const bp = `${details.bloodPressureSystolic}/${details.bloodPressureDiastolic}`;
      
      // Optimistically update UI with the new values
      // This will make the changes appear immediately before backend confirms
      setHealthProfile((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...profileUpdate
        };
      });
      
      setHealthMetrics((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          heart_rate: Number(details.heartRate),
          blood_pressure_systolic: Number(details.bloodPressureSystolic),
          blood_pressure_diastolic: Number(details.bloodPressureDiastolic),
          cholesterol: Number(details.cholesterol),
          weight: Number(details.weight),
          recorded_at: new Date()
        };
      });
      
      // Update health profile
      await updateHealthProfile(profileUpdate);
      
      // Update metrics through vitals
      await updateHealthMetrics({
        heart_rate: Number(details.heartRate),
        blood_pressure_systolic: Number(details.bloodPressureSystolic),
        blood_pressure_diastolic: Number(details.bloodPressureDiastolic),
        cholesterol: Number(details.cholesterol),
        weight: Number(details.weight)
      });

      // Refresh data to get the latest updates from server
      // This ensures UI is in sync with backend
      await refreshPatientData();

      setShowForm(false);
      setError(null);
      setSuccessToast('Patient details updated successfully!');
    } catch (error) {
      console.error('Error saving patient details:', error);
      setError('Failed to save patient details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate personalized advice based on patient data
  const getPersonalizedAdvice = () => {
    if (!healthProfile || !healthMetrics) return [];
    
    const advice = [];
    
    // Blood pressure advice
    if ((healthMetrics.blood_pressure_systolic || 120) > 140 || (healthMetrics.blood_pressure_diastolic || 80) > 90) {
      advice.push({
        title: "High Blood Pressure Alert",
        description: "Your blood pressure readings are elevated. Consider reducing sodium intake, increasing physical activity, and consulting with your physician.",
        icon: FaTint,
        severity: "high"
      });
    } else if ((healthMetrics.blood_pressure_systolic || 120) > 120 || (healthMetrics.blood_pressure_diastolic || 80) > 80) {
      advice.push({
        title: "Elevated Blood Pressure",
        description: "Your blood pressure is slightly elevated. Monitor closely and consider lifestyle modifications.",
        icon: FaTint,
        severity: "medium"
      });
    }
    
    // Heart rate advice
    if ((healthMetrics.heart_rate || 75) > 100) {
      advice.push({
        title: "Elevated Heart Rate",
        description: "Your resting heart rate is higher than normal. Consider stress reduction techniques and consult with your healthcare provider.",
        icon: FaHeartbeat,
        severity: "medium"
      });
    }
    
    // Cholesterol advice
    if ((healthMetrics.cholesterol || 180) > 240) {
      advice.push({
        title: "High Cholesterol Alert",
        description: "Your cholesterol levels are significantly elevated. Consider dietary changes, exercise, and medication review with your doctor.",
        icon: FaClipboardList,
        severity: "high"
      });
    } else if ((healthMetrics.cholesterol || 180) > 200) {
      advice.push({
        title: "Borderline High Cholesterol",
        description: "Your cholesterol is slightly elevated. Focus on heart-healthy foods and regular exercise.",
        icon: FaClipboardList,
        severity: "medium"
      });
    }
    
    // Weight advice
    const bmi = (healthMetrics.weight || 70) / (((healthProfile.height || 170) / 100) * ((healthProfile.height || 170) / 100));
    if (bmi > 30) {
      advice.push({
        title: "Weight Management",
        description: "Your BMI indicates obesity. Consider working with a nutritionist and increasing physical activity.",
        icon: FaWeight,
        severity: "high"
      });
    } else if (bmi > 25) {
      advice.push({
        title: "Weight Consideration",
        description: "Your BMI indicates overweight. Small changes to diet and activity can help manage weight.",
        icon: FaWeight,
        severity: "medium"
      });
    }
    
    // Heart condition specific advice
    if (healthProfile.has_heart_condition) {
      advice.push({
        title: "Heart Condition Management",
        description: "With your heart condition, regular monitoring and medication adherence are crucial. Schedule regular check-ups.",
        icon: FaUserMd,
        severity: "high"
      });
    }
    
    // Add generic advice if nothing specific
    if (advice.length === 0) {
      advice.push({
        title: "Maintaining Good Health",
        description: "Your metrics look good! Continue with your healthy lifestyle and regular check-ups.",
        icon: FaHospital,
        severity: "low"
      });
    }
    
    return advice;
  };

  // Prepare data for charts
  const prepareChartData = (metricName: string) => {
    if (!vitalHistory || vitalHistory.length === 0) {
      // Create demo data if no vitals exist
      const dates = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'MMM dd'));
      
      // Default values based on metric
      let values;
      if (metricName === 'heartRate') {
        values = [72, 75, 71, 74, 73, 75, 72];
      } else if (metricName === 'bloodPressureSystolic') {
        values = [118, 121, 119, 122, 120, 118, 121];
      } else if (metricName === 'bloodPressureDiastolic') {
        values = [78, 80, 79, 81, 79, 78, 80];
      } else if (metricName === 'glucose') {
        values = [5.2, 5.5, 5.3, 5.4, 5.6, 5.5, 5.4];
      } else {
        values = [70, 70, 69.5, 70, 70.5, 71, 70.5]; // Weight
      }
      
      return {
        labels: dates,
        datasets: [
          {
            label: metricName,
            data: values,
            borderColor: getColorForMetric(metricName),
            backgroundColor: `${getColorForMetric(metricName)}33`,
            fill: true,
            tension: 0.4
          }
        ]
      };
    }

    // Limit to last 7 readings for clarity
    const recentVitals = vitalHistory.slice(-7);
    const labels = recentVitals.map(v => format(new Date(v.timestamp), 'MMM dd'));
    
    let data: number[];
    if (metricName === 'heartRate') {
      data = recentVitals.map(v => v.heartRate);
    } else if (metricName === 'bloodPressureSystolic') {
      data = recentVitals.map(v => v.bloodPressureSystolic);
    } else if (metricName === 'bloodPressureDiastolic') {
      data = recentVitals.map(v => v.bloodPressureDiastolic);
    } else if (metricName === 'glucose') {
      data = recentVitals.map(v => v.glucose);
    } else {
      data = recentVitals.map(v => v.weight);
    }

    return {
      labels,
      datasets: [
        {
          label: getLabelForMetric(metricName),
          data,
          borderColor: getColorForMetric(metricName),
          backgroundColor: `${getColorForMetric(metricName)}33`,
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const getLabelForMetric = (metricName: string): string => {
    switch (metricName) {
      case 'heartRate': return 'Heart Rate (BPM)';
      case 'bloodPressureSystolic': return 'Systolic BP (mmHg)';
      case 'bloodPressureDiastolic': return 'Diastolic BP (mmHg)';
      case 'glucose': return 'Glucose (mmol/L)';
      case 'weight': return 'Weight (kg)';
      default: return metricName;
    }
  };

  const getColorForMetric = (metricName: string): string => {
    switch (metricName) {
      case 'heartRate': return '#ef4444'; // red
      case 'bloodPressureSystolic': 
      case 'bloodPressureDiastolic': return '#3b82f6'; // blue
      case 'glucose': return '#f59e0b'; // amber
      case 'weight': return '#10b981'; // green
      default: return '#6b7280'; // gray
    }
  };

  // Calculate risk factors for Heart Risk Assessment
  const calculateRiskFactors = () => {
    if (!healthMetrics) return [];
    
    return [
      {
        name: 'Blood Pressure',
        value: (healthMetrics.blood_pressure_systolic || 120) > 140 ? 75 : 
               (healthMetrics.blood_pressure_systolic || 120) > 120 ? 50 : 25,
        color: '#3B82F6'
      },
      {
        name: 'Heart Rate',
        value: (healthMetrics.heart_rate || 75) > 100 ? 75 :
               (healthMetrics.heart_rate || 75) > 80 ? 50 : 25,
        color: '#EF4444'
      },
      {
        name: 'Glucose',
        value: (healthMetrics.glucose || 5.5) > 7 ? 75 :
               (healthMetrics.glucose || 5.5) > 5.7 ? 50 : 25,
        color: '#F59E0B'
      },
      {
        name: 'Weight',
        value: healthProfile && (healthMetrics.weight || 70) > ((healthProfile.height || 170) * 0.4) ? 75 :
               healthProfile && (healthMetrics.weight || 70) > ((healthProfile.height || 170) * 0.35) ? 50 : 25,
        color: '#10B981'
      }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingAnimation text="LOADING PATIENT DATA" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-md bg-black/30 border border-white/20 rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]"
        >
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowForm(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Update Health Profile</h2>
            <p className="text-gray-400 mt-1">Keep your information up-to-date for better health insights</p>
            <div className="h-1 w-20 bg-gradient-to-r from-red-600 to-red-500 rounded-full mt-2"></div>
          </div>
          <PatientDetailsForm 
            onSubmit={handlePatientDetailsSubmit} 
            initialData={healthProfile && healthMetrics ? {
              name: healthProfile.name || "",
              age: healthProfile.age || 30,
              height: healthProfile.height || 170,
              weight: healthMetrics.weight || 70,
              heartRate: healthMetrics.heart_rate || 75,
              bloodPressureSystolic: healthMetrics.blood_pressure_systolic || 120,
              bloodPressureDiastolic: healthMetrics.blood_pressure_diastolic || 80,
              cholesterol: healthMetrics.cholesterol || 180,
              bloodSugar: healthMetrics.glucose ? healthMetrics.glucose * 18 : 100, // Convert mmol/L to mg/dL
              hasHeartCondition: healthProfile.has_heart_condition || false,
              hadHeartAttack: healthProfile.had_heart_attack || false,
              lastHeartAttack: healthProfile.last_heart_attack ? 
                new Date(healthProfile.last_heart_attack).toISOString().split('T')[0] : undefined,
              currentMedications: healthProfile.medications?.map((med: any) => ({
                name: med.name || '',
                dosage: med.dosage || '',
                frequency: med.frequency || '',
                timeOfDay: Array.isArray(med.time_of_day) ? med.time_of_day.join(', ') : '',
                startDate: med.start_date ? new Date(med.start_date).toISOString().split('T')[0] : '',
              })) || [],
              allergies: Array.isArray(healthProfile.allergies) ? healthProfile.allergies.join(', ') : '',
              conditions: Array.isArray(healthProfile.conditions) ? healthProfile.conditions.join(', ') : '',
              familyHistory: Array.isArray(healthProfile.family_history) ? healthProfile.family_history.join(', ') : '',
              smoker: healthProfile.lifestyle?.smoker || false,
              alcoholConsumption: healthProfile.lifestyle?.alcohol_consumption || healthProfile.lifestyle?.alcoholConsumption || 'light',
              exerciseFrequency: healthProfile.lifestyle?.exercise_frequency || healthProfile.lifestyle?.exerciseFrequency || 2,
              diet: healthProfile.lifestyle?.diet || '',
              stressLevel: healthProfile.lifestyle?.stress_level || healthProfile.lifestyle?.stressLevel || 3,
            } : undefined} 
          />
        </motion.div>
      </div>
    );
  }

  if (!healthProfile || !healthMetrics) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <motion.div
          animate={{ scale: [0.9, 1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
        <FaUserPlus className="w-16 h-16 text-red-500" />
        </motion.div>
        <Title className="text-white">Welcome to Your Health Profile</Title>
        <p className="text-gray-300 text-center max-w-md">
          Please take a moment to set up your health profile. This will help us provide 
          personalized health recommendations and better monitor your well-being.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-3 rounded-full flex items-center space-x-2 hover:from-red-700 hover:to-red-600 transition-all duration-300"
        >
          <FaUserPlus />
          <span>Set Up Health Profile</span>
        </motion.button>
      </div>
    );
  }

  const personalizedAdvice = getPersonalizedAdvice();
  const riskFactors = calculateRiskFactors();

  // Update chart options for dark theme
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      }
    },
  };

  return (
    <div className="space-y-6 text-white">
      {successToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3"
        >
          <span className="flex items-center justify-center bg-white bg-opacity-25 rounded-full p-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="font-medium">{successToast}</span>
        </motion.div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">{healthProfile?.name || "Patient"}</h2>
          <p className="text-gray-300">
            Age: {healthProfile?.age || 30} | Height: {healthProfile?.height || 170}cm | Weight: {healthMetrics?.weight || 70}kg
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg hover:shadow-red-500/30 transition-all duration-300"
        >
          <FaUserPlus className="w-4 h-4" />
          <span>Update Details</span>
        </motion.button>
      </div>

      {/* Current Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Heart Rate",
            value: healthMetrics?.heart_rate?.toString() || "75",
            icon: FaHeartbeat,
            color: "red" as const,
            unit: "BPM",
            status: healthAnalysis?.metrics?.heartRate?.status || 'normal'
          },
          {
            title: "Blood Pressure",
            value: `${healthMetrics?.blood_pressure_systolic || 120}/${healthMetrics?.blood_pressure_diastolic || 80}`,
            icon: FaTint,
            color: "blue" as const,
            unit: "mmHg",
            status: healthAnalysis?.metrics?.bloodPressure?.status || 'normal'
          },
          {
            title: "Glucose",
            value: (healthMetrics?.glucose || 5.5).toString(),
            icon: FaChartLine,
            color: "amber" as const,
            unit: "mmol/L",
            status: healthAnalysis?.metrics?.glucose?.status || 'normal'
          },
          {
            title: "Weight",
            value: healthMetrics?.weight?.toString() || "70",
            icon: FaWeight,
            color: "green" as const,
            unit: "kg",
            status: healthAnalysis?.metrics?.weight?.status || 'normal'
          }
        ].map((metric, index) => (
          <motion.div
            key={index}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
        <HealthMetricsCard
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              color={metric.color}
              unit={metric.unit}
              status={metric.status}
            />
          </motion.div>
        ))}
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <motion.div
          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold mb-2 text-white">Heart Rate Trend</h3>
          <div className="h-64 mt-4">
            <Line data={prepareChartData('heartRate')} options={chartOptions} />
          </div>
        </motion.div>
        
        <motion.div
          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h3 className="text-xl font-semibold mb-2 text-white">Blood Pressure Trend</h3>
          <div className="h-64 mt-4">
            <Line data={prepareChartData('bloodPressureSystolic')} options={chartOptions} />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <motion.div
          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <h3 className="text-xl font-semibold mb-2 text-white">Glucose Trend</h3>
          <div className="h-64 mt-4">
            <Line data={prepareChartData('glucose')} options={chartOptions} />
          </div>
        </motion.div>

        <motion.div
          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <h3 className="text-xl font-semibold mb-2 text-white">Weight Trend</h3>
          <div className="h-64 mt-4">
            <Line data={prepareChartData('weight')} options={chartOptions} />
          </div>
        </motion.div>
      </div>

      {/* Risk Assessment and Health Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <motion.div
          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <h3 className="text-xl font-semibold mb-2 text-white">Heart Health Risk Assessment</h3>
          <HeartRiskAssessment riskFactors={riskFactors} />
        </motion.div>

        <motion.div
          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-4 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Health Summary</h3>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPersonalizedAdvice(!showPersonalizedAdvice)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full"
            >
              {showPersonalizedAdvice ? 'Hide Advice' : 'View Advice'}
            </motion.button>
          </div>
          <div className="mt-4 space-y-4">
            {healthAnalysis && (
              <div>
                <p className="text-lg font-medium text-white">
                  {healthAnalysis.riskLevel === 'low' && '✅ Your health metrics indicate a low risk profile.'}
                  {healthAnalysis.riskLevel === 'moderate' && '⚠️ Your health metrics indicate a moderate risk profile.'}
                  {healthAnalysis.riskLevel === 'high' && '❗ Your health metrics indicate a high risk profile.'}
                </p>
                <p className="text-gray-300 mt-2">{healthAnalysis.summary}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Personalized Advice Section */}
      {showPersonalizedAdvice && personalizedAdvice.length > 0 && (
        <motion.div 
          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Personalized Health Advice</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPersonalizedAdvice(false)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full"
            >
              Hide
            </motion.button>
            </div>
          <div className="space-y-4">
            {personalizedAdvice.map((advice, index) => (
              <motion.div 
                key={index} 
                className={`p-4 rounded-lg flex items-start space-x-4 ${
                  advice.severity === 'high' ? 'bg-red-900/30 border border-red-500/30' : 
                  advice.severity === 'medium' ? 'bg-amber-900/30 border border-amber-500/30' : 
                  'bg-green-900/30 border border-green-500/30'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className={`p-2 rounded-full ${
                  advice.severity === 'high' ? 'bg-red-900/50 text-red-400' : 
                  advice.severity === 'medium' ? 'bg-amber-900/50 text-amber-400' : 
                  'bg-green-900/50 text-green-400'
                }`}>
                  <advice.icon className="w-5 h-5" />
            </div>
                <div>
                  <h4 className="font-medium text-white">{advice.title}</h4>
                  <p className="text-gray-300 text-sm mt-1">{advice.description}</p>
            </div>
              </motion.div>
            ))}
            </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-sm text-gray-400">
              Note: This advice is generated based on your health data. Always consult with a healthcare professional before making significant changes to your health regimen.
            </p>
          </div>
        </motion.div>
      )}

      {/* Medications */}
      <motion.div 
        className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.8 }}
      >
        <h3 className="text-xl font-semibold text-white mb-4">Current Medications</h3>
        {healthProfile?.medications && healthProfile.medications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthProfile.medications.map((med: any, index: number) => (
              <motion.div 
                key={index} 
                className="border border-white/10 bg-white/5 rounded-lg p-4"
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.8 + (index * 0.1) }}
              >
                <h4 className="font-medium text-white">{med.name}</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-300">
                  <p>Dosage: {med.dosage}</p>
                  <p>Frequency: {med.frequency}</p>
                  <p>Time of Day: {Array.isArray(med.time_of_day) ? med.time_of_day.join(', ') : med.time_of_day}</p>
                  <p>Started: {med.start_date ? format(new Date(med.start_date), 'MMM dd, yyyy') : 'N/A'}</p>
                </div>
              </motion.div>
            ))}
              </div>
        ) : (
          <p className="text-gray-300">No medications recorded.</p>
        )}
      </motion.div>

      {/* Recent Symptoms */}
      {symptoms && symptoms.length > 0 && (
        <motion.div 
          className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Recent Symptoms</h3>
          <div className="space-y-4">
            {symptoms.slice(0, 3).map((symptom: any, index: number) => (
              <motion.div 
                key={index} 
                className="border border-white/10 bg-white/5 rounded-lg p-4"
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.9 + (index * 0.1) }}
              >
                <div className="flex justify-between">
                  <h4 className="font-medium text-white">{symptom.type}</h4>
                  <span className="text-sm text-gray-400">
                    {symptom.timestamp ? format(new Date(symptom.timestamp), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-300">
                  <p>Severity: {symptom.severity}/10</p>
                  {symptom.description && <p>Description: {symptom.description}</p>}
                  {symptom.duration && <p>Duration: {symptom.duration} hours</p>}
                </div>
              </motion.div>
            ))}
        </div>
        </motion.div>
      )}
    </div>
  );
}
