'use client';

import { useState, useEffect } from 'react';
import { Card, Title, BarList } from "@tremor/react";
import { Line } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import { FaHeartbeat, FaWeight, FaTint, FaChartLine, FaLungs, FaHospital } from 'react-icons/fa';
import HealthMetricsCard from './HealthMetricsCard';
import HeartRiskAssessment from './HeartRiskAssessment';

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
  const [vitalHistory, setVitalHistory] = useState<VitalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, fetch this data from your backend
    const mockVitalHistory: VitalHistory[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: subDays(new Date(), 29 - i),
      heartRate: 70 + Math.random() * 20,
      bloodPressureSystolic: 120 + Math.random() * 20,
      bloodPressureDiastolic: 80 + Math.random() * 10,
      weight: 70 + Math.random() * 2,
      cholesterol: 180 + Math.random() * 20,
      oxygenSaturation: 95 + Math.random() * 5,
      temperature: 36.5 + Math.random() * 1,
    }));

    setVitalHistory(mockVitalHistory);
    setLoading(false);
  }, [patientId]);

  const latest = vitalHistory[vitalHistory.length - 1];
  const previous = vitalHistory[vitalHistory.length - 2];

  const calculateTrend = (current: number, previous: number) => {
    return previous ? ((current - previous) / previous) * 100 : 0;
  };

  const getVitalStatus = (metric: string, value: number): 'normal' | 'warning' | 'critical' => {
    switch (metric) {
      case 'heartRate':
        if (value < 60 || value > 100) return 'warning';
        if (value < 50 || value > 120) return 'critical';
        return 'normal';
      case 'bloodPressure':
        if (value > 140 || value < 90) return 'warning';
        if (value > 180 || value < 80) return 'critical';
        return 'normal';
      case 'oxygenSaturation':
        if (value < 95) return 'warning';
        if (value < 90) return 'critical';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const riskFactors = [
    {
      name: 'Blood Pressure',
      value: latest ? (latest.bloodPressureSystolic > 140 ? 75 : 30) : 0,
      color: '#3B82F6'
    },
    {
      name: 'Heart Rate',
      value: latest ? (latest.heartRate > 100 ? 65 : 25) : 0,
      color: '#EF4444'
    },
    {
      name: 'Cholesterol',
      value: latest ? (latest.cholesterol > 200 ? 60 : 20) : 0,
      color: '#F59E0B'
    },
    {
      name: 'Oxygen Levels',
      value: latest ? (latest.oxygenSaturation < 95 ? 70 : 15) : 0,
      color: '#10B981'
    }
  ];

  if (loading) {
    return <div className="p-4">Loading patient data...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!latest || !previous) {
    return <div className="p-4">No vital data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthMetricsCard
          title="Heart Rate"
          value={latest.heartRate.toFixed(0)}
          icon={FaHeartbeat}
          color="red"
          unit="BPM"
          trend={calculateTrend(latest.heartRate, previous.heartRate)}
          status={getVitalStatus('heartRate', latest.heartRate)}
        />
        
        <HealthMetricsCard
          title="Blood Pressure"
          value={`${latest.bloodPressureSystolic.toFixed(0)}/${latest.bloodPressureDiastolic.toFixed(0)}`}
          icon={FaTint}
          color="blue"
          trend={calculateTrend(latest.bloodPressureSystolic, previous.bloodPressureSystolic)}
          status={getVitalStatus('bloodPressure', latest.bloodPressureSystolic)}
        />

        <HealthMetricsCard
          title="Oxygen Saturation"
          value={latest.oxygenSaturation.toFixed(1)}
          icon={FaLungs}
          color="green"
          unit="%"
          trend={calculateTrend(latest.oxygenSaturation, previous.oxygenSaturation)}
          status={getVitalStatus('oxygenSaturation', latest.oxygenSaturation)}
        />

        <HealthMetricsCard
          title="Temperature"
          value={latest.temperature.toFixed(1)}
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
          overallRisk={Math.round(riskFactors.reduce((acc, curr) => acc + curr.value, 0) / riskFactors.length)}
        />

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
                    HR: {vital.heartRate.toFixed(0)} BPM, 
                    BP: {vital.bloodPressureSystolic.toFixed(0)}/{vital.bloodPressureDiastolic.toFixed(0)},
                    O₂: {vital.oxygenSaturation.toFixed(0)}%
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
      </div>

      {/* Medication Schedule */}
      <Card>
        <Title>Today's Medication Schedule</Title>
        <div className="mt-4 space-y-4">
          {[
            { time: '08:00 AM', name: 'Aspirin', dosage: '81mg', taken: true },
            { time: '02:00 PM', name: 'Metoprolol', dosage: '25mg', taken: false },
            { time: '08:00 PM', name: 'Atorvastatin', dosage: '40mg', taken: false },
          ].map((med, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${med.taken ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <div>
                  <p className="font-medium">{med.name}</p>
                  <p className="text-sm text-gray-600">{med.dosage} - {med.time}</p>
                </div>
              </div>
              {!med.taken && (
                <button className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded-full hover:bg-red-50">
                  Take Now
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
