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
      // Generate vital history based on patient details
      const mockVitalHistory: VitalHistory[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: subDays(new Date(), 29 - i),
        heartRate: Number(patientDetails.heartRate) + (Math.random() - 0.5) * 10,
        bloodPressureSystolic: Number(patientDetails.bloodPressureSystolic) + (Math.random() - 0.5) * 10,
        bloodPressureDiastolic: Number(patientDetails.bloodPressureDiastolic) + (Math.random() - 0.5) * 10,
        weight: Number(patientDetails.weight) + (Math.random() - 0.5) * 1,
        cholesterol: Number(patientDetails.cholesterol) + (Math.random() - 0.5) * 10,
        oxygenSaturation: 95 + Math.random() * 5,
        temperature: 36.5 + (Math.random() - 0.5) * 0.5,
      }));

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
      age: Number(details.age),
      weight: Number(details.weight),
      height: Number(details.height),
      bloodPressureSystolic: Number(details.bloodPressureSystolic),
      bloodPressureDiastolic: Number(details.bloodPressureDiastolic),
      heartRate: Number(details.heartRate),
      cholesterol: Number(details.cholesterol),
      bloodSugar: Number(details.bloodSugar),
      exerciseFrequency: Number(details.exerciseFrequency),
      stressLevel: Number(details.stressLevel),
      symptomSeverity: Number(details.symptomSeverity),
      symptomDuration: Number(details.symptomDuration),
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
          <h2 className="text-2xl font-bold text-gray-900">{patientDetails.name}</h2>
          <p className="text-gray-600">
            Age: {patientDetails.age} | Gender: {patientDetails.gender}
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
          value={Number(latest.heartRate).toFixed(0)}
          icon={FaHeartbeat}
          color="red"
          unit="BPM"
          trend={calculateTrend(latest.heartRate, previous.heartRate)}
          status={getVitalStatus('heartRate', latest.heartRate)}
        />
        
        <HealthMetricsCard
          title="Blood Pressure"
          value={`${Number(latest.bloodPressureSystolic).toFixed(0)}/${Number(latest.bloodPressureDiastolic).toFixed(0)}`}
          icon={FaTint}
          color="blue"
          trend={calculateTrend(latest.bloodPressureSystolic, previous.bloodPressureSystolic)}
          status={getVitalStatus('bloodPressure', latest.bloodPressureSystolic)}
        />

        <HealthMetricsCard
          title="Oxygen Saturation"
          value={Number(latest.oxygenSaturation).toFixed(1)}
          icon={FaLungs}
          color="green"
          unit="%"
          trend={calculateTrend(latest.oxygenSaturation, previous.oxygenSaturation)}
          status={getVitalStatus('oxygenSaturation', latest.oxygenSaturation)}
        />

        <HealthMetricsCard
          title="Temperature"
          value={Number(latest.temperature).toFixed(1)}
          icon={FaHospital}
          color="yellow"
          unit="°C"
          trend={calculateTrend(latest.temperature, previous.temperature)}
          status={getVitalStatus('temperature', latest.temperature)}
        />
      </div>

      {/* Risk Assessment and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeartRiskAssessment
          riskFactors={riskFactors}
          overallRisk={healthAnalysis.riskScore}
        />

        <Card>
          <Title>Health Recommendations</Title>
          <div className="mt-4 space-y-4">
            {healthAnalysis.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                </div>
                <div className="flex-grow">
                  <p className="text-sm text-gray-600">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Health Events */}
      <Card>
        <Title>Recent Health Events</Title>
        <div className="mt-4 space-y-4">
          {vitalHistory.slice(-5).reverse().map((vital, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium">
                  Vital Check - {format(vital.timestamp, 'MMM d, h:mm a')}
                </p>
                <p className="text-sm text-gray-600">
                  HR: {Number(vital.heartRate).toFixed(0)} BPM, 
                  BP: {Number(vital.bloodPressureSystolic).toFixed(0)}/{Number(vital.bloodPressureDiastolic).toFixed(0)},
                  O₂: {Number(vital.oxygenSaturation).toFixed(0)}%
                </p>
              </div>
              {getVitalStatus('heartRate', vital.heartRate) !== 'normal' && (
                <div className="flex-shrink-0">
                  <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                    Attention
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Medication Schedule */}
      <Card>
        <Title>Today's Medication Schedule</Title>
        <div className="mt-4 space-y-4">
          {patientDetails.currentMedications.map((med, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <div>
                  <p className="font-medium">{med}</p>
                  <p className="text-sm text-gray-600">Next dose: {format(new Date(), 'h:mm a')}</p>
                </div>
              </div>
              <button className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded-full hover:bg-red-50">
                Take Now
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
