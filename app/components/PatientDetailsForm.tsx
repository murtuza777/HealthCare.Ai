'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Title, Button } from "@tremor/react";
import { ReactNode } from 'react';
import { FaCheck, FaChevronLeft, FaChevronRight, FaSave, FaSpinner } from 'react-icons/fa';

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
  onSubmit: (details: PatientDetails) => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateStep = (currentStep: number) => {
    const errors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.name) errors.name = 'Name is required';
      if (formData.age <= 0) errors.age = 'Please enter a valid age';
      if (formData.weight <= 0) errors.weight = 'Please enter a valid weight';
      if (formData.height <= 0) errors.height = 'Please enter a valid height';
    } else if (currentStep === 3) {
      if (formData.bloodPressureSystolic <= 0) errors.bloodPressureSystolic = 'Please enter a valid value';
      if (formData.bloodPressureDiastolic <= 0) errors.bloodPressureDiastolic = 'Please enter a valid value';
      if (formData.heartRate <= 0) errors.heartRate = 'Please enter a valid heart rate';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? Number(value) : value
    }));
    
    // Clear error for this field if it exists
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step < totalSteps) {
      if (validateStep(step)) {
        setStep(step + 1);
      }
    } else {
      if (validateStep(step)) {
        setIsSubmitting(true);
        try {
          await onSubmit(formData);
          setSuccessMessage('Health profile updated successfully!');
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccessMessage('');
          }, 3000);
        } catch (error) {
          console.error('Error submitting form:', error);
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

  const goToPrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Title className="text-white">Personal Information</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                label="Name" 
                name="name" 
                type="text" 
                value={formData.name} 
                onChange={handleInputChange}
                error={fieldErrors.name}
              />
              <FormField 
                label="Age" 
                name="age" 
                type="number" 
                value={formData.age} 
                onChange={handleInputChange}
                error={fieldErrors.age}
              />
              <FormField 
                label="Weight (kg)" 
                name="weight" 
                type="number" 
                value={formData.weight} 
                onChange={handleInputChange}
                error={fieldErrors.weight}
              />
              <FormField 
                label="Height (cm)" 
                name="height" 
                type="number" 
                value={formData.height} 
                onChange={handleInputChange}
                error={fieldErrors.height}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Title className="text-white">Medical History</Title>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="hasHeartCondition"
                  checked={formData.hasHeartCondition}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-red-600 focus:ring-red-500 bg-white/10 border-white/20 rounded"
                />
                <label className="text-sm font-medium text-white">
                  Do you have any heart conditions?
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="hadHeartAttack"
                  checked={formData.hadHeartAttack}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-red-600 focus:ring-red-500 bg-white/10 border-white/20 rounded"
                />
                <label className="text-sm font-medium text-white">
                  Have you ever had a heart attack?
                </label>
              </div>
              {formData.hadHeartAttack && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <FormField
                    label="Date of Last Heart Attack"
                    name="lastHeartAttack"
                    type="date"
                    value={formData.lastHeartAttack}
                    onChange={handleInputChange}
                  />
                </motion.div>
              )}
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-white mb-1">Allergies (comma separated)</label>
                <textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleInputChange}
                  className="mt-1 block w-full bg-white/10 backdrop-blur-sm text-white rounded-md shadow-sm border border-white/20 focus:border-red-500 focus:ring-red-500"
                  rows={2}
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-white mb-1">Medical Conditions (comma separated)</label>
                <textarea
                  name="conditions"
                  value={formData.conditions}
                  onChange={handleInputChange}
                  className="mt-1 block w-full bg-white/10 backdrop-blur-sm text-white rounded-md shadow-sm border border-white/20 focus:border-red-500 focus:ring-red-500"
                  rows={2}
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-white mb-1">Family Health History (comma separated)</label>
                <textarea
                  name="familyHistory"
                  value={formData.familyHistory}
                  onChange={handleInputChange}
                  className="mt-1 block w-full bg-white/10 backdrop-blur-sm text-white rounded-md shadow-sm border border-white/20 focus:border-red-500 focus:ring-red-500"
                  rows={2}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Title className="text-white">Current Health Metrics</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField 
                label="Blood Pressure (Systolic)" 
                name="bloodPressureSystolic" 
                type="number" 
                value={formData.bloodPressureSystolic} 
                onChange={handleInputChange}
                error={fieldErrors.bloodPressureSystolic}
              />
              <FormField 
                label="Blood Pressure (Diastolic)" 
                name="bloodPressureDiastolic" 
                type="number" 
                value={formData.bloodPressureDiastolic} 
                onChange={handleInputChange}
                error={fieldErrors.bloodPressureDiastolic}
              />
              <FormField 
                label="Heart Rate" 
                name="heartRate" 
                type="number" 
                value={formData.heartRate} 
                onChange={handleInputChange}
                error={fieldErrors.heartRate}
              />
              <FormField 
                label="Cholesterol" 
                name="cholesterol" 
                type="number" 
                value={formData.cholesterol} 
                onChange={handleInputChange}
              />
              <FormField 
                label="Blood Sugar" 
                name="bloodSugar" 
                type="number" 
                value={formData.bloodSugar} 
                onChange={handleInputChange}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Title className="text-white">Lifestyle & Health Habits</Title>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="smoker"
                  checked={formData.smoker}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-red-600 focus:ring-red-500 bg-white/10 border-white/20 rounded"
                />
                <label className="text-sm font-medium text-white">Do you smoke?</label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Alcohol Consumption</label>
                <select
                  name="alcoholConsumption"
                  value={formData.alcoholConsumption}
                  onChange={handleInputChange}
                  className="mt-1 block w-full bg-white/10 backdrop-blur-sm text-white rounded-md shadow-sm border border-white/20 focus:border-red-500 focus:ring-red-500"
                >
                  <option value="none">None</option>
                  <option value="light">Light (1-2 drinks/week)</option>
                  <option value="moderate">Moderate (3-7 drinks/week)</option>
                  <option value="heavy">Heavy (8+ drinks/week)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Exercise Frequency (days per week)
                </label>
                <input
                  type="range"
                  name="exerciseFrequency"
                  min="0"
                  max="7"
                  value={formData.exerciseFrequency}
                  onChange={handleInputChange}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-center mt-1 text-white">{formData.exerciseFrequency} days/week</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">Diet Description</label>
                <textarea
                  name="diet"
                  value={formData.diet}
                  onChange={handleInputChange}
                  className="mt-1 block w-full bg-white/10 backdrop-blur-sm text-white rounded-md shadow-sm border border-white/20 focus:border-red-500 focus:ring-red-500"
                  rows={2}
                  placeholder="Describe your typical diet..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Stress Level (1-10)
                </label>
                <input
                  type="range"
                  name="stressLevel"
                  min="1"
                  max="10"
                  value={formData.stressLevel}
                  onChange={handleInputChange}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
                <div className="text-center mt-1 text-white">Level: {formData.stressLevel}</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="relative overflow-hidden backdrop-blur-md bg-black/20 border border-white/10 shadow-xl">
      <form onSubmit={handleSubmit}>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-white">Step {step} of {totalSteps}</span>
            <span className="text-sm font-medium text-white">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5">
            <motion.div 
              className="bg-gradient-to-r from-red-600 to-red-500 h-2.5 rounded-full" 
              initial={{ width: `${((step - 1) / totalSteps) * 100}%` }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[400px]"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Success Message */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 right-4 bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2 rounded-md flex items-center space-x-2 border border-white/10 shadow-lg"
            >
              <FaCheck className="text-white" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            color="gray"
            variant="secondary"
            disabled={step === 1}
            onClick={goToPrevStep}
            icon={FaChevronLeft}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-300"
          >
            Previous
          </Button>
          
          <Button
            type="submit"
            color="red"
            disabled={isSubmitting}
            icon={step < totalSteps ? FaChevronRight : (isSubmitting ? FaSpinner : FaSave)}
            className={`${isSubmitting ? "animate-pulse" : ""} bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg hover:shadow-red-500/30 transition-all duration-300`}
          >
            {step < totalSteps ? "Next" : (isSubmitting ? "Saving..." : "Save Profile")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface FormFieldProps {
  label: string;
  name: string;
  type: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  error?: string;
}

function FormField({ label, name, type, value, onChange, error }: FormFieldProps) {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-white mb-1">{label}</label>
      <motion.div
        whileFocus={{ scale: 1.01 }}
        className="relative"
      >
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className={`mt-1 block w-full bg-white/10 backdrop-blur-sm text-white rounded-md shadow-sm border focus:ring-red-500 focus:border-red-500 transition-all duration-300 ${
            error ? 'border-red-500 bg-red-900/20' : 'border-white/20 hover:border-white/40'
          }`}
        />
        <motion.div
          initial={false}
          animate={{ width: error ? '100%' : '0%' }}
          className="absolute bottom-0 left-0 h-0.5 bg-red-500"
          style={{ borderRadius: '0 0 4px 4px' }}
        />
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-1 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
