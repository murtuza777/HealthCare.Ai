'use client';

import { useState, useEffect } from 'react';
import { Card, Title, BarList, Button } from "@tremor/react";
import { Line } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import { FaHeartbeat, FaWeight, FaTint, FaChartLine, FaLungs, FaHospital, FaUserPlus } from 'react-icons/fa';
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
          trend={0}
          status={healthAnalysis?.metrics.bloodPressure?.status || 'normal'}
        />

        <HealthMetricsCard
          title="Cholesterol"
          value={healthMetrics.cholesterol.toString()}
          icon={FaChartLine}
          color="yellow"
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

      {/* Risk Assessment and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeartRiskAssessment
          riskFactors={riskFactors}
          overallRisk={healthAnalysis?.riskScore || 0}
        />

        <Card>
          <Title>Health Recommendations</Title>
          <div className="mt-4 space-y-4">
            {healthAnalysis?.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                </div>
                <div className="flex-grow">
                  <p className="text-sm text-gray-600">{recommendation}</p>
                </div>
              </div>
            )) || (
              <p className="text-gray-500">No recommendations available yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Medical History */}
      <Card>
        <Title>Medical History</Title>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${healthProfile.hasHeartCondition ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Heart Condition: {healthProfile.hasHeartCondition ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${healthProfile.hadHeartAttack ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Previous Heart Attack: {healthProfile.hadHeartAttack ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${healthProfile.lifestyle.smoker ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Smoker: {healthProfile.lifestyle.smoker ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${healthProfile.lifestyle.exerciseFrequency >= 3 ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>Exercise: {healthProfile.lifestyle.exerciseFrequency} days/week</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Medications */}
      <Card>
        <Title>Current Medications</Title>
        <div className="mt-4 space-y-4">
          {healthProfile.medications && healthProfile.medications.length > 0 ? (
            healthProfile.medications.map((med, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium">{med.name}</p>
                    <p className="text-sm text-gray-600">{med.frequency} - {med.dosage}</p>
                  </div>
                </div>
                <button className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50">
                  View Details
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No medications listed</p>
          )}
        </div>
      </Card>
    </div>
  );
}
