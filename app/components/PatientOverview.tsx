'use client';

import { useState, useEffect } from 'react';
import { Card, Title, BarList, Button } from "@tremor/react";
import { Line } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import { FaHeartbeat, FaWeight, FaTint, FaChartLine, FaLungs, FaHospital, FaUserPlus, FaUserMd, FaClipboardList } from 'react-icons/fa';
import HealthMetricsCard from './HealthMetricsCard';
import HeartRiskAssessment from './HeartRiskAssessment';
import PatientDetailsForm, { PatientDetails } from './PatientDetailsForm';
import { analyzeHealthData } from '../utils/healthAnalysis';
import { usePatient } from '../context/PatientContext';
import { HealthProfile, HealthMetrics, Symptom } from '../utils/types';

interface VitalHistory {
  timestamp: Date;
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  weight: number;
  cholesterol: number;
  oxygenSaturation: number;
  temperature: number;
}

interface PatientOverviewProps {
  patientId: string;
}

export default function PatientOverview({ patientId }: PatientOverviewProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<any>(null);
  const [showPersonalizedAdvice, setShowPersonalizedAdvice] = useState(false);
  const { healthProfile, healthMetrics, symptoms, updateHealthProfile, updateHealthMetrics } = usePatient();

  useEffect(() => {
    if (healthProfile && healthMetrics) {
      const analysis = analyzeHealthData(healthProfile, healthMetrics);
      setHealthAnalysis(analysis);
    }
    setLoading(false);
  }, [healthProfile, healthMetrics]);

  const handlePatientDetailsSubmit = (details: PatientDetails) => {
    try {
      // Convert form data to HealthProfile
      const newHealthProfile: HealthProfile = {
        name: details.name,
        age: details.age,
        height: details.height,
        weight: details.weight,
        hasHeartCondition: details.hasHeartCondition,
        hadHeartAttack: details.hadHeartAttack,
        lastHeartAttack: details.lastHeartAttack ? new Date(details.lastHeartAttack) : undefined,
        medications: details.currentMedications.map(med => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          timeOfDay: med.timeOfDay.split(','),
          startDate: new Date(med.startDate),
        })),
        allergies: details.allergies.split(',').map(a => a.trim()),
        conditions: details.conditions.split(',').map(c => c.trim()),
        familyHistory: details.familyHistory.split(',').map(h => h.trim()),
        lifestyle: {
          smoker: details.smoker,
          alcoholConsumption: details.alcoholConsumption as 'none' | 'light' | 'moderate' | 'heavy',
          exerciseFrequency: Number(details.exerciseFrequency),
          diet: details.diet,
          stressLevel: Number(details.stressLevel),
        },
      };

      // Convert form data to HealthMetrics
      const newHealthMetrics: HealthMetrics = {
        heartRate: Number(details.heartRate),
        bloodPressureSystolic: Number(details.bloodPressureSystolic),
        bloodPressureDiastolic: Number(details.bloodPressureDiastolic),
        cholesterol: Number(details.cholesterol),
        weight: Number(details.weight),
        lastUpdated: new Date(),
      };

      // Update context with new data
      updateHealthProfile(newHealthProfile);
      updateHealthMetrics(newHealthMetrics);

      setShowForm(false);
      setError(null);
    } catch (error) {
      console.error('Error saving patient details:', error);
      setError('Failed to save patient details. Please try again.');
    }
  };

  // Generate personalized advice based on patient data
  const getPersonalizedAdvice = () => {
    if (!healthProfile || !healthMetrics) return [];
    
    const advice = [];
    
    // Blood pressure advice
    if (healthMetrics.bloodPressureSystolic > 140 || healthMetrics.bloodPressureDiastolic > 90) {
      advice.push({
        title: "High Blood Pressure Alert",
        description: "Your blood pressure readings are elevated. Consider reducing sodium intake, increasing physical activity, and consulting with your physician.",
        icon: FaTint,
        severity: "high"
      });
    } else if (healthMetrics.bloodPressureSystolic > 120 || healthMetrics.bloodPressureDiastolic > 80) {
      advice.push({
        title: "Elevated Blood Pressure",
        description: "Your blood pressure is slightly elevated. Monitor closely and consider lifestyle modifications.",
        icon: FaTint,
        severity: "medium"
      });
    }
    
    // Heart rate advice
    if (healthMetrics.heartRate > 100) {
      advice.push({
        title: "Elevated Heart Rate",
        description: "Your resting heart rate is higher than normal. Consider stress reduction techniques and consult with your healthcare provider.",
        icon: FaHeartbeat,
        severity: "medium"
      });
    }
    
    // Cholesterol advice
    if (healthMetrics.cholesterol > 240) {
      advice.push({
        title: "High Cholesterol Alert",
        description: "Your cholesterol levels are significantly elevated. Consider dietary changes, exercise, and medication review with your doctor.",
        icon: FaClipboardList,
        severity: "high"
      });
    } else if (healthMetrics.cholesterol > 200) {
      advice.push({
        title: "Borderline High Cholesterol",
        description: "Your cholesterol is slightly elevated. Focus on heart-healthy foods and regular exercise.",
        icon: FaClipboardList,
        severity: "medium"
      });
    }
    
    // Weight advice
    const bmi = healthMetrics.weight / ((healthProfile.height / 100) * (healthProfile.height / 100));
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
    if (healthProfile.hasHeartCondition) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Title>Update Patient Details</Title>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowForm(false)}
            icon={FaUserPlus}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        <PatientDetailsForm 
          onSubmit={handlePatientDetailsSubmit} 
          initialData={healthProfile && healthMetrics ? {
            name: healthProfile.name,
            age: healthProfile.age,
            height: healthProfile.height,
            weight: healthMetrics.weight,
            heartRate: healthMetrics.heartRate,
            bloodPressureSystolic: healthMetrics.bloodPressureSystolic,
            bloodPressureDiastolic: healthMetrics.bloodPressureDiastolic,
            cholesterol: healthMetrics.cholesterol,
            hasHeartCondition: healthProfile.hasHeartCondition,
            hadHeartAttack: healthProfile.hadHeartAttack,
            lastHeartAttack: healthProfile.lastHeartAttack ? healthProfile.lastHeartAttack.toISOString().split('T')[0] : undefined,
            currentMedications: healthProfile.medications.map(med => ({
              ...med,
              timeOfDay: Array.isArray(med.timeOfDay) ? med.timeOfDay.join(', ') : '',
              startDate: med.startDate ? new Date(med.startDate).toISOString().split('T')[0] : '',
            })),
            allergies: Array.isArray(healthProfile.allergies) ? healthProfile.allergies.join(', ') : '',
            conditions: Array.isArray(healthProfile.conditions) ? healthProfile.conditions.join(', ') : '',
            familyHistory: Array.isArray(healthProfile.familyHistory) ? healthProfile.familyHistory.join(', ') : '',
            smoker: healthProfile.lifestyle.smoker,
            alcoholConsumption: healthProfile.lifestyle.alcoholConsumption,
            exerciseFrequency: healthProfile.lifestyle.exerciseFrequency,
            diet: healthProfile.lifestyle.diet,
            stressLevel: healthProfile.lifestyle.stressLevel,
          } : undefined} 
        />
      </div>
    );
  }

  if (!healthProfile || !healthMetrics) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <FaUserPlus className="w-16 h-16 text-red-500" />
        <Title>Welcome to Your Health Profile</Title>
        <p className="text-gray-600 text-center max-w-md">
          Please take a moment to set up your health profile. This will help us provide 
          personalized health recommendations and better monitor your well-being.
        </p>
        <Button
          size="lg"
          variant="primary"
          onClick={() => setShowForm(true)}
          icon={FaUserPlus}
        >
          Set Up Health Profile
        </Button>
      </div>
    );
  }

  const calculateTrend = (current: number, previous: number) => {
    return previous ? ((current - previous) / previous) * 100 : 0;
  };

  const getVitalStatus = (metric: string, value: number): 'normal' | 'warning' | 'critical' => {
    if (healthAnalysis.metrics[metric]) {
      return healthAnalysis.metrics[metric].status;
    }
    return 'normal';
  };

  const riskFactors = [
    {
      name: 'Blood Pressure',
      value: healthMetrics.bloodPressureSystolic > 140 ? 75 : 
             healthMetrics.bloodPressureSystolic > 120 ? 50 : 25,
      color: '#3B82F6'
    },
    {
      name: 'Heart Rate',
      value: healthMetrics.heartRate > 100 ? 75 :
             healthMetrics.heartRate > 80 ? 50 : 25,
      color: '#EF4444'
    },
    {
      name: 'Cholesterol',
      value: healthMetrics.cholesterol > 240 ? 75 :
             healthMetrics.cholesterol > 200 ? 50 : 25,
      color: '#F59E0B'
    },
    {
      name: 'Weight',
      value: healthMetrics.weight > (healthProfile.height * 0.4) ? 75 :
             healthMetrics.weight > (healthProfile.height * 0.35) ? 50 : 25,
      color: '#10B981'
    }
  ];

  const personalizedAdvice = getPersonalizedAdvice();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{healthProfile.name}</h2>
          <p className="text-gray-600">
            Age: {healthProfile.age} | Height: {healthProfile.height}cm | Weight: {healthProfile.weight}kg
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowForm(true)}
          icon={FaUserPlus}
        >
          Update Details
        </Button>
      </div>

      {/* Current Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthMetricsCard
          title="Heart Rate"
          value={healthMetrics.heartRate.toString()}
          icon={FaHeartbeat}
          color="red"
          unit="BPM"
          trend={0}
          status={healthAnalysis?.metrics.heartRate?.status || 'normal'}
        />
        
        <HealthMetricsCard
          title="Blood Pressure"
          value={`${healthMetrics.bloodPressureSystolic}/${healthMetrics.bloodPressureDiastolic}`}
          icon={FaTint}
          color="blue"
          unit="mmHg"
          trend={0}
          status={healthAnalysis?.metrics.bloodPressure?.status || 'normal'}
        />
        
        <HealthMetricsCard
          title="Cholesterol"
          value={healthMetrics.cholesterol.toString()}
          icon={FaChartLine}
          color="amber"
          unit="mg/dL"
          trend={0}
          status={healthAnalysis?.metrics.cholesterol?.status || 'normal'}
        />
        
        <HealthMetricsCard
          title="Weight"
          value={healthMetrics.weight.toString()}
          icon={FaWeight}
          color="green"
          unit="kg"
          trend={0}
          status={healthAnalysis?.metrics.weight?.status || 'normal'}
        />
      </div>

      {/* Risk Assessment and Health Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <Title>Heart Health Risk Assessment</Title>
          <HeartRiskAssessment riskFactors={riskFactors} />
        </Card>
        
        <Card>
          <div className="flex justify-between items-center">
            <Title>Health Summary</Title>
            <Button 
              size="xs" 
              variant="light"
              onClick={() => setShowPersonalizedAdvice(!showPersonalizedAdvice)}
            >
              {showPersonalizedAdvice ? 'Hide Advice' : 'View Advice'}
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            {healthAnalysis && (
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {healthAnalysis.riskLevel === 'low' && '✅ Your health metrics indicate a low risk profile.'}
                  {healthAnalysis.riskLevel === 'moderate' && '⚠️ Your health metrics indicate a moderate risk profile.'}
                  {healthAnalysis.riskLevel === 'high' && '❗ Your health metrics indicate a high risk profile.'}
                </p>
                <p className="text-gray-600 mt-2">{healthAnalysis.summary}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Personalized Advice Section */}
      {showPersonalizedAdvice && personalizedAdvice.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Personalized Health Advice</h3>
            <Button
              size="xs"
              variant="light"
              onClick={() => setShowPersonalizedAdvice(false)}
            >
              Hide
            </Button>
          </div>
          <div className="space-y-4">
            {personalizedAdvice.map((advice, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg flex items-start space-x-4 ${
                  advice.severity === 'high' ? 'bg-red-50' : 
                  advice.severity === 'medium' ? 'bg-amber-50' : 'bg-green-50'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  advice.severity === 'high' ? 'bg-red-100 text-red-600' : 
                  advice.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                }`}>
                  <advice.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium">{advice.title}</h4>
                  <p className="text-gray-600 text-sm mt-1">{advice.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Note: This advice is generated based on your health data. Always consult with a healthcare professional before making significant changes to your health regimen.
            </p>
          </div>
        </div>
      )}

      {/* Medications */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Current Medications</h3>
        {healthProfile.medications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthProfile.medications.map((med, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-medium">{med.name}</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>Dosage: {med.dosage}</p>
                  <p>Frequency: {med.frequency}</p>
                  <p>Time of Day: {med.timeOfDay.join(', ')}</p>
                  <p>Started: {format(new Date(med.startDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No medications recorded.</p>
        )}
      </div>
    </div>
  );
}
