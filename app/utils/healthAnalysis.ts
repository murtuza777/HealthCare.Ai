import { HealthProfile, HealthMetrics } from './types';

export function analyzeHealthData(profile: HealthProfile, metrics: HealthMetrics) {
  const analysis = {
    riskScore: 0,
    metrics: {
      bloodPressure: { status: 'normal' },
      heartRate: { status: 'normal' },
      cholesterol: { status: 'normal' },
      weight: { status: 'normal' }
    },
    recommendations: [] as string[]
  };

  // Analyze blood pressure
  if (metrics.bloodPressureSystolic > 140 || metrics.bloodPressureDiastolic > 90) {
    analysis.metrics.bloodPressure.status = 'critical';
    analysis.riskScore += 30;
    analysis.recommendations.push('Monitor blood pressure regularly and consult with your doctor');
  } else if (metrics.bloodPressureSystolic > 120 || metrics.bloodPressureDiastolic > 80) {
    analysis.metrics.bloodPressure.status = 'warning';
    analysis.riskScore += 15;
    analysis.recommendations.push('Consider lifestyle changes to improve blood pressure');
  }

  // Analyze heart rate
  if (metrics.heartRate > 100) {
    analysis.metrics.heartRate.status = 'critical';
    analysis.riskScore += 25;
    analysis.recommendations.push('Monitor heart rate and discuss with your healthcare provider');
  } else if (metrics.heartRate > 80) {
    analysis.metrics.heartRate.status = 'warning';
    analysis.riskScore += 10;
    analysis.recommendations.push('Consider increasing cardiovascular exercise');
  }

  // Analyze cholesterol
  if (metrics.cholesterol > 240) {
    analysis.metrics.cholesterol.status = 'critical';
    analysis.riskScore += 30;
    analysis.recommendations.push('Schedule a follow-up for cholesterol management');
  } else if (metrics.cholesterol > 200) {
    analysis.metrics.cholesterol.status = 'warning';
    analysis.riskScore += 15;
    analysis.recommendations.push('Consider dietary changes to improve cholesterol levels');
  }

  // Analyze lifestyle factors
  if (profile.lifestyle.smoker) {
    analysis.riskScore += 35;
    analysis.recommendations.push('Consider smoking cessation programs for better health');
  }

  if (profile.lifestyle.alcoholConsumption === 'heavy') {
    analysis.riskScore += 25;
    analysis.recommendations.push('Consider reducing alcohol consumption');
  }

  if (profile.lifestyle.exerciseFrequency < 3) {
    analysis.riskScore += 20;
    analysis.recommendations.push('Increase physical activity to at least 3 times per week');
  }

  if (profile.lifestyle.stressLevel > 7) {
    analysis.riskScore += 15;
    analysis.recommendations.push('Consider stress management techniques');
  }

  // Add condition-specific recommendations
  if (profile.hasHeartCondition) {
    analysis.riskScore += 40;
    analysis.recommendations.push('Regular cardiac check-ups are essential');
  }

  if (profile.hadHeartAttack) {
    analysis.riskScore += 50;
    analysis.recommendations.push('Follow post-heart attack care plan strictly');
  }

  // Cap risk score at 100
  analysis.riskScore = Math.min(analysis.riskScore, 100);

  return analysis;
}
