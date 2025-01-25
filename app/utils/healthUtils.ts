import { HealthMetrics, Symptom } from './types';

export function calculateRiskScore(metrics: HealthMetrics, symptoms: Symptom[]): number {
  let riskScore = 0;

  // Blood pressure risk
  if (metrics.bloodPressureSystolic >= 140 || metrics.bloodPressureDiastolic >= 90) {
    riskScore += 2;
  } else if (metrics.bloodPressureSystolic >= 130 || metrics.bloodPressureDiastolic >= 80) {
    riskScore += 1;
  }

  // Heart rate risk
  if (metrics.heartRate > 100 || metrics.heartRate < 60) {
    riskScore += 1;
  }

  // Cholesterol risk
  if (metrics.cholesterol > 200) {
    riskScore += 1;
  }

  // Recent symptoms risk
  const recentSymptoms = symptoms.filter(
    s => new Date().getTime() - s.timestamp.getTime() < 24 * 60 * 60 * 1000
  );
  
  riskScore += recentSymptoms.reduce((acc, symptom) => {
    if (symptom.severity >= 7) return acc + 3;
    if (symptom.severity >= 4) return acc + 2;
    return acc + 1;
  }, 0);

  return Math.min(riskScore, 10);
}

export function isEmergencySymptom(symptom: Symptom): boolean {
  const emergencySymptoms = [
    'chest pain',
    'shortness of breath',
    'fainting',
    'severe dizziness',
    'cold sweat',
    'nausea',
    'jaw pain',
    'left arm pain'
  ];

  return (
    symptom.severity >= 7 ||
    emergencySymptoms.some(s => symptom.type.toLowerCase().includes(s)) ||
    symptom.accompaniedBy.some(s => emergencySymptoms.includes(s.toLowerCase()))
  );
}

export function generateHealthTips(profile: any): string[] {
  const tips: string[] = [];

  if (profile.lifestyle.smoker) {
    tips.push('Consider joining a smoking cessation program. Quitting smoking can significantly reduce your heart attack risk.');
  }

  if (profile.lifestyle.exerciseFrequency < 3) {
    tips.push('Try to incorporate at least 30 minutes of moderate exercise, like brisk walking, 5 times a week.');
  }

  if (profile.lifestyle.stressLevel > 7) {
    tips.push('High stress levels can impact heart health. Consider stress-reduction techniques like meditation or yoga.');
  }

  if (profile.hadHeartAttack) {
    tips.push('Regular cardiac rehabilitation sessions can help strengthen your heart and reduce future risks.');
  }

  return tips;
}

export function getMedicationSchedule(medications: any[]): string {
  return medications
    .map(med => `${med.name} (${med.dosage}): ${med.frequency} - ${med.timeOfDay.join(', ')}`)
    .join('\n');
}

export const EMERGENCY_INSTRUCTIONS = `
If you experience:
- Severe chest pain or pressure
- Difficulty breathing
- Sudden weakness or dizziness
- Severe sweating with chest discomfort

IMMEDIATELY:
1. Call emergency services (911)
2. Take prescribed nitroglycerin if available
3. Chew an aspirin if recommended by your doctor
4. Stay calm and seated or lying down
5. Unlock your door for emergency responders
`;
