'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Title, Button } from "@tremor/react";
import { ReactNode } from 'react';

export interface PatientDetails {
  name: string;
  age: number;
  weight: number;
  height: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  cholesterol: number;
  bloodSugar: number;
  hasHeartCondition: boolean;
  hadHeartAttack: boolean;
  lastHeartAttack?: string;
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    timeOfDay: string;
    startDate: string;
  }>;
  allergies: string;
  conditions: string;
  familyHistory: string;
  smoker: boolean;
  alcoholConsumption: string;
  exerciseFrequency: number;
  diet: string;
  stressLevel: number;
  currentSymptoms?: Array<{
    type: string;
    severity: number;
    description: string;
    duration: number;
    accompaniedBy: string;
  }>;
}

interface PatientDetailsFormProps {
  onSubmit: (details: PatientDetails) => void;
  initialData?: Partial<PatientDetails>;
}

export default function PatientDetailsForm({ onSubmit, initialData }: PatientDetailsFormProps) {
  const [formData, setFormData] = useState<PatientDetails>({
    name: initialData?.name || '',
    age: initialData?.age || 0,
    weight: initialData?.weight || 0,
    height: initialData?.height || 0,
    bloodPressureSystolic: initialData?.bloodPressureSystolic || 120,
    bloodPressureDiastolic: initialData?.bloodPressureDiastolic || 80,
    heartRate: initialData?.heartRate || 72,
    cholesterol: initialData?.cholesterol || 180,
    bloodSugar: initialData?.bloodSugar || 100,
    hasHeartCondition: initialData?.hasHeartCondition || false,
    hadHeartAttack: initialData?.hadHeartAttack || false,
    lastHeartAttack: initialData?.lastHeartAttack,
    currentMedications: initialData?.currentMedications || [],
    allergies: initialData?.allergies || '',
    conditions: initialData?.conditions || '',
    familyHistory: initialData?.familyHistory || '',
    smoker: initialData?.smoker || false,
    alcoholConsumption: initialData?.alcoholConsumption || 'none',
    exerciseFrequency: initialData?.exerciseFrequency || 0,
    diet: initialData?.diet || '',
    stressLevel: initialData?.stressLevel || 0,
    currentSymptoms: initialData?.currentSymptoms || [],
  });

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onSubmit(formData);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Title>Personal Information</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Title>Medical History</Title>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="hasHeartCondition"
                  checked={formData.hasHeartCondition}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Do you have any heart conditions?
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="hadHeartAttack"
                  checked={formData.hadHeartAttack}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Have you ever had a heart attack?
                </label>
              </div>
              {formData.hadHeartAttack && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date of Last Heart Attack
                  </label>
                  <input
                    type="date"
                    name="lastHeartAttack"
                    value={formData.lastHeartAttack}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Title>Current Health Metrics</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Blood Pressure (Systolic)
                </label>
                <input
                  type="number"
                  name="bloodPressureSystolic"
                  value={formData.bloodPressureSystolic}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Blood Pressure (Diastolic)
                </label>
                <input
                  type="number"
                  name="bloodPressureDiastolic"
                  value={formData.bloodPressureDiastolic}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Heart Rate</label>
                <input
                  type="number"
                  name="heartRate"
                  value={formData.heartRate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cholesterol</label>
                <input
                  type="number"
                  name="cholesterol"
                  value={formData.cholesterol}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Title>Lifestyle & Symptoms</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Exercise Frequency (days per week)
                </label>
                <input
                  type="number"
                  name="exerciseFrequency"
                  value={formData.exerciseFrequency}
                  onChange={handleInputChange}
                  min="0"
                  max="7"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stress Level (1-10)
                </label>
                <input
                  type="number"
                  name="stressLevel"
                  value={formData.stressLevel}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Symptoms (comma-separated)
                </label>
                <input
                  type="text"
                  name="currentSymptoms"
                  value={formData.currentSymptoms?.map(s => s.type).join(', ') || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    currentSymptoms: e.target.value ? e.target.value.split(',').map(s => ({
                      type: s.trim(),
                      severity: 0,
                      description: '',
                      duration: 0,
                      accompaniedBy: ''
                    })) : []
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Medications (comma-separated)
                </label>
                <input
                  type="text"
                  name="currentMedications"
                  value={formData.currentMedications.map(m => m.name).join(', ')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    currentMedications: e.target.value.split(',').map(s => ({
                      name: s.trim(),
                      dosage: '',
                      frequency: '',
                      timeOfDay: '',
                      startDate: ''
                    }))
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderStep()}
          
          <div className="flex justify-between items-center mt-6">
            {step > 1 && (
              <Button
                type="button"
                onClick={() => setStep(step - 1)}
                color="gray"
              >
                Previous
              </Button>
            )}
            <Button
              type="submit"
              color="red"
              className="ml-auto"
            >
              {step === totalSteps ? 'Submit' : 'Next'}
            </Button>
          </div>

          <div className="flex justify-center space-x-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i + 1 === step ? 'bg-red-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
