'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Metric, Text, Flex, Badge, AreaChart } from '@tremor/react';
import { FaHeartbeat, FaTint, FaChartLine } from 'react-icons/fa';
import { usePatient } from '@/app/context/PatientContext';
import { format } from 'date-fns';

export default function LatestVitalsWidget() {
  const { vitals } = usePatient();
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    if (vitals && vitals.length > 0) {
      try {
        // Generate chart data from the last 10 vitals readings
        const last10Vitals = vitals.slice(0, 10).reverse();
        
        const newChartData = last10Vitals.map(vital => {
          const bp = vital?.blood_pressure ? vital.blood_pressure.split('/') : ['0', '0'];
          return {
            date: format(new Date(vital?.timestamp || new Date()), 'MMM dd, HH:mm'),
            Systolic: parseInt(bp[0]) || 0,
            Diastolic: parseInt(bp[1]) || 0,
            Glucose: vital?.glucose || 0,
          };
        });
        
        setChartData(newChartData);
      } catch (error) {
        console.error('Error creating chart data in LatestVitalsWidget:', error);
        setChartData([]);
      }
    }
  }, [vitals]);
  
  if (!vitals || vitals.length === 0) {
    return (
      <Card className="mx-auto">
        <Title>Vital Signs</Title>
        <Text>No vitals data available. Please update your health metrics.</Text>
      </Card>
    );
  }
  
  // Get the latest vital
  const latestVital = vitals[0];
  if (!latestVital) {
    return (
      <Card className="mx-auto">
        <Title>Vital Signs</Title>
        <Text>Error loading vital signs data.</Text>
      </Card>
    );
  }
  
  const bloodPressure = latestVital.blood_pressure ? latestVital.blood_pressure.split('/') : ['--', '--'];
  const systolic = parseInt(bloodPressure[0]);
  const diastolic = parseInt(bloodPressure[1]);
  const glucose = latestVital.glucose || 0;
  
  // Determine status colors
  const getBPStatusColor = (systolic: number, diastolic: number) => {
    if (isNaN(systolic) || isNaN(diastolic)) return 'gray';
    if (systolic >= 140 || diastolic >= 90) return 'red';
    if (systolic >= 120 || diastolic >= 80) return 'yellow';
    return 'green';
  };
  
  const getGlucoseStatusColor = (value: number) => {
    if (isNaN(value)) return 'gray';
    if (value >= 11.1) return 'red';
    if (value >= 7.8) return 'yellow';
    return 'green';
  };
  
  const bpColor = getBPStatusColor(systolic, diastolic);
  const glucoseColor = getGlucoseStatusColor(glucose);
  
  return (
    <Card className="mx-auto">
      <Title>Vital Signs</Title>
      <Text>Real-time health monitoring</Text>
      
      <Flex className="mt-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <FaTint className="text-blue-500" />
            <div>
              <Text>Blood Pressure</Text>
              <div className="flex items-center">
                <Metric>{latestVital.blood_pressure || '--/--'}</Metric>
                <Badge color={bpColor} className="ml-2">
                  {bpColor === 'red' ? 'High' : bpColor === 'yellow' ? 'Elevated' : bpColor === 'gray' ? 'Unknown' : 'Normal'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <FaChartLine className="text-green-500" />
            <div>
              <Text>Glucose (mmol/L)</Text>
              <div className="flex items-center">
                <Metric>{(glucose || 0).toFixed(1)}</Metric>
                <Badge color={glucoseColor} className="ml-2">
                  {glucoseColor === 'red' ? 'High' : glucoseColor === 'yellow' ? 'Elevated' : glucoseColor === 'gray' ? 'Unknown' : 'Normal'}
                </Badge>
              </div>
            </div>
          </div>
          
          <Text className="text-sm text-gray-500">
            Last updated: {format(new Date(latestVital.timestamp || new Date()), 'MMM dd, yyyy HH:mm')}
          </Text>
        </div>
      </Flex>
      
      {chartData.length > 1 && (
        <div className="mt-6">
          <Text>Trend (Last {chartData.length} Readings)</Text>
          <AreaChart
            className="h-40 mt-2"
            data={chartData}
            index="date"
            categories={["Systolic", "Diastolic", "Glucose"]}
            colors={["rose", "indigo", "green"]}
            valueFormatter={(value) => `${value}`}
            showLegend={true}
            showYAxis={true}
            showXAxis={true}
          />
        </div>
      )}
    </Card>
  );
} 