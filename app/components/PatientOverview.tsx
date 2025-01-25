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
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [vitalHistory, setVitalHistory] = useState<VitalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthAnalysis, setHealthAnalysis] = useState<any>(null);

  useEffect(() => {
    if (patientDetails) {
      // Create vital history using exact patient details
      const currentVital: VitalHistory = {
        timestamp: new Date(),
        heartRate: Number(patientDetails.heartRate),
        bloodPressureSystolic: Number(patientDetails.bloodPressureSystolic),
        bloodPressureDiastolic: Number(patientDetails.bloodPressureDiastolic),
        weight: Number(patientDetails.weight),
        cholesterol: Number(patientDetails.cholesterol),
        oxygenSaturation: Number(patientDetails.bloodSugar), // Using blood sugar as oxygen saturation for demo
        temperature: 37.0, // Normal body temperature
      };

      // Create history with slight variations for the past 30 days
      const mockVitalHistory: VitalHistory[] = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const variation = i === 29 ? 0 : (Math.random() - 0.5) * 2; // No variation for current day
        
        return {
          timestamp: date,
          heartRate: i === 29 ? currentVital.heartRate : currentVital.heartRate + variation,
          bloodPressureSystolic: i === 29 ? currentVital.bloodPressureSystolic : 
            currentVital.bloodPressureSystolic + variation,
          bloodPressureDiastolic: i === 29 ? currentVital.bloodPressureDiastolic :
            currentVital.bloodPressureDiastolic + variation,
          weight: i === 29 ? currentVital.weight : currentVital.weight + (variation * 0.1),
          cholesterol: i === 29 ? currentVital.cholesterol : currentVital.cholesterol + variation,
          oxygenSaturation: i === 29 ? currentVital.oxygenSaturation : 
            currentVital.oxygenSaturation + (variation * 0.5),
          temperature: i === 29 ? currentVital.temperature : 
            currentVital.temperature + (variation * 0.1),
        };
      });

      setVitalHistory(mockVitalHistory);
      
      // Analyze health data
      const analysis = analyzeHealthData(patientDetails);
      setHealthAnalysis(analysis);
      
      setLoading(false);
    }
  }, [patientDetails]);

  const handlePatientDetailsSubmit = (details: PatientDetails) => {
    // Ensure all numeric fields are converted to numbers
    const processedDetails = {
      ...details,
      age: Number(details.age) || 0,
      weight: Number(details.weight) || 0,
      height: Number(details.height) || 0,
      bloodPressureSystolic: Number(details.bloodPressureSystolic) || 120,
      bloodPressureDiastolic: Number(details.bloodPressureDiastolic) || 80,
      heartRate: Number(details.heartRate) || 72,
      cholesterol: Number(details.cholesterol) || 180,
      bloodSugar: Number(details.bloodSugar) || 100,
      exerciseFrequency: Number(details.exerciseFrequency) || 0,
      stressLevel: Number(details.stressLevel) || 0,
      symptomSeverity: Number(details.symptomSeverity) || 0,
      symptomDuration: Number(details.symptomDuration) || 0,
    };
    
    setPatientDetails(processedDetails);
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Title>Enter Patient Details</Title>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowForm(false)}
            icon={FaUserPlus}
          >
            Cancel
          </Button>
        </div>
        <PatientDetailsForm onSubmit={handlePatientDetailsSubmit} initialData={patientDetails || undefined} />
      </div>
    );
  }

  if (!patientDetails || !healthAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <FaUserPlus className="w-16 h-16 text-red-500" />
        <Title>No Patient Data Available</Title>
        <p className="text-gray-600">Please add patient details to view health metrics</p>
        <Button
          size="lg"
          variant="primary"
          onClick={() => setShowForm(true)}
          icon={FaUserPlus}
        >
          Add Patient Details
        </Button>
      </div>
    );
  }

  const latest = vitalHistory[vitalHistory.length - 1];
  const previous = vitalHistory[vitalHistory.length - 2];

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
      value: healthAnalysis.metrics.bloodPressure?.status === 'critical' ? 75 : 
             healthAnalysis.metrics.bloodPressure?.status === 'warning' ? 50 : 25,
      color: '#3B82F6'
    },
    {
      name: 'Heart Rate',
      value: healthAnalysis.metrics.heartRate?.status === 'critical' ? 75 :
             healthAnalysis.metrics.heartRate?.status === 'warning' ? 50 : 25,
      color: '#EF4444'
    },
    {
      name: 'Cholesterol',
      value: healthAnalysis.metrics.cholesterol?.status === 'critical' ? 75 :
             healthAnalysis.metrics.cholesterol?.status === 'warning' ? 50 : 25,
      color: '#F59E0B'
    },
    {
      name: 'BMI',
      value: healthAnalysis.metrics.bmi?.status === 'critical' ? 75 :
             healthAnalysis.metrics.bmi?.status === 'warning' ? 50 : 25,
      color: '#10B981'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{patientDetails?.name}</h2>
          <p className="text-gray-600">
            Age: {patientDetails?.age} | Gender: {patientDetails?.gender} | 
            Height: {patientDetails?.height}cm | Weight: {patientDetails?.weight}kg
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
          value={patientDetails?.heartRate.toString() || '0'}
          icon={FaHeartbeat}
          color="red"
          unit="BPM"
          trend={0} // No trend for initial reading
          status={healthAnalysis?.metrics.heartRate?.status || 'normal'}
        />
        
        <HealthMetricsCard
          title="Blood Pressure"
          value={`${patientDetails?.bloodPressureSystolic || 0}/${patientDetails?.bloodPressureDiastolic || 0}`}
          icon={FaTint}
          color="blue"
          trend={0} // No trend for initial reading
          status={healthAnalysis?.metrics.bloodPressure?.status || 'normal'}
        />

        <HealthMetricsCard
          title="Cholesterol"
          value={patientDetails?.cholesterol.toString() || '0'}
          icon={FaChartLine}
          color="yellow"
          unit="mg/dL"
          trend={0} // No trend for initial reading
          status={healthAnalysis?.metrics.cholesterol?.status || 'normal'}
        />

        <HealthMetricsCard
          title="Blood Sugar"
          value={patientDetails?.bloodSugar.toString() || '0'}
          icon={FaLungs}
          color="green"
          unit="mg/dL"
          trend={0} // No trend for initial reading
          status={healthAnalysis?.metrics.bloodSugar?.status || 'normal'}
        />
      </div>

      {/* Risk Assessment and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeartRiskAssessment
          riskFactors={[
            {
              name: 'Blood Pressure',
              value: Number(patientDetails?.bloodPressureSystolic || 0) > 140 ? 75 : 
                     Number(patientDetails?.bloodPressureSystolic || 0) > 120 ? 50 : 25,
              color: '#3B82F6'
            },
            {
              name: 'Heart Rate',
              value: Number(patientDetails?.heartRate || 0) > 100 ? 75 :
                     Number(patientDetails?.heartRate || 0) > 80 ? 50 : 25,
              color: '#EF4444'
            },
            {
              name: 'Cholesterol',
              value: Number(patientDetails?.cholesterol || 0) > 240 ? 75 :
                     Number(patientDetails?.cholesterol || 0) > 200 ? 50 : 25,
              color: '#F59E0B'
            },
            {
              name: 'Blood Sugar',
              value: Number(patientDetails?.bloodSugar || 0) > 140 ? 75 :
                     Number(patientDetails?.bloodSugar || 0) > 100 ? 50 : 25,
              color: '#10B981'
            }
          ]}
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
              <div className={`w-3 h-3 rounded-full ${patientDetails?.hasHeartCondition ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Heart Condition: {patientDetails?.hasHeartCondition ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${patientDetails?.hadHeartAttack ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Previous Heart Attack: {patientDetails?.hadHeartAttack ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${patientDetails?.smoker ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Smoker: {patientDetails?.smoker ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${Number(patientDetails?.exerciseFrequency || 0) >= 3 ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span>Exercise: {patientDetails?.exerciseFrequency || 0} days/week</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Medications */}
      <Card>
        <Title>Current Medications</Title>
        <div className="mt-4 space-y-4">
          {patientDetails?.currentMedications && patientDetails.currentMedications.length > 0 ? (
            patientDetails.currentMedications.map((med, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium">{med}</p>
                    <p className="text-sm text-gray-600">Daily</p>
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
