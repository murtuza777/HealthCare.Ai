import { HealthProfile, HealthMetrics } from './types';

interface HealthAnalysis {
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high';
  summary: string;
  recommendations: string[];
  metrics: {
    [key: string]: {
      status: 'normal' | 'warning' | 'critical';
      message: string;
    }
  };
}

export function analyzeHealthData(
  profile: HealthProfile,
  metrics: HealthMetrics
): HealthAnalysis {
  // Initialize analysis object
  const analysis: HealthAnalysis = {
    riskScore: 0,
    riskLevel: 'low',
    summary: '',
    recommendations: [],
    metrics: {
      heartRate: { status: 'normal', message: 'Your heart rate is normal.' },
      bloodPressure: { status: 'normal', message: 'Your blood pressure is normal.' },
      cholesterol: { status: 'normal', message: 'Your cholesterol is within normal range.' },
      weight: { status: 'normal', message: 'Your weight is in a healthy range.' }
    }
  };

  // Calculate BMI
  const heightInMeters = profile.height / 100;
  const bmi = metrics.weight / (heightInMeters * heightInMeters);
  let bmiRisk = 0;

  // Analyze metrics and calculate risk factors
  let totalRiskScore = 0;
  let riskFactors = 0;

  // Heart Rate Analysis
  if (metrics.heartRate > 100) {
    analysis.metrics.heartRate = {
      status: 'critical',
      message: 'Your heart rate is elevated. Consider consulting with a doctor.'
    };
    totalRiskScore += 20;
    riskFactors++;
    analysis.recommendations.push('Consult with your doctor about your elevated heart rate.');
  } else if (metrics.heartRate > 90) {
    analysis.metrics.heartRate = {
      status: 'warning',
      message: 'Your heart rate is slightly elevated.'
    };
    totalRiskScore += 10;
    riskFactors++;
    analysis.recommendations.push('Monitor your heart rate regularly and practice relaxation techniques.');
  }

  // Blood Pressure Analysis
  if (metrics.bloodPressureSystolic > 140 || metrics.bloodPressureDiastolic > 90) {
    analysis.metrics.bloodPressure = {
      status: 'critical',
      message: 'Your blood pressure is high. This increases risk of heart disease and stroke.'
    };
    totalRiskScore += 25;
    riskFactors++;
    analysis.recommendations.push('Consider following the DASH diet to lower blood pressure.');
    analysis.recommendations.push('Limit sodium intake to less than 2,300mg per day.');
  } else if (metrics.bloodPressureSystolic > 120 || metrics.bloodPressureDiastolic > 80) {
    analysis.metrics.bloodPressure = {
      status: 'warning',
      message: 'Your blood pressure is elevated. This may develop into high blood pressure.'
    };
    totalRiskScore += 15;
    riskFactors++;
    analysis.recommendations.push('Increase physical activity to 150 minutes per week.');
    analysis.recommendations.push('Reduce sodium in your diet.');
  }

  // Cholesterol Analysis
  if (metrics.cholesterol > 240) {
    analysis.metrics.cholesterol = {
      status: 'critical',
      message: 'Your cholesterol is high. This increases risk of heart disease.'
    };
    totalRiskScore += 25;
    riskFactors++;
    analysis.recommendations.push('Consider a Mediterranean diet rich in healthy fats.');
    analysis.recommendations.push('Increase fiber intake with whole grains, fruits, and vegetables.');
  } else if (metrics.cholesterol > 200) {
    analysis.metrics.cholesterol = {
      status: 'warning',
      message: 'Your cholesterol is borderline high.'
    };
    totalRiskScore += 15;
    riskFactors++;
    analysis.recommendations.push('Limit saturated fats and increase omega-3 fatty acids in your diet.');
  }

  // Weight Analysis
  if (bmi > 30) {
    analysis.metrics.weight = {
      status: 'critical',
      message: 'Your BMI indicates obesity, which increases risk for multiple health conditions.'
    };
    totalRiskScore += 20;
    riskFactors++;
    bmiRisk = 20;
    analysis.recommendations.push('Consider consulting with a dietitian for a personalized meal plan.');
    analysis.recommendations.push('Aim for 30 minutes of moderate physical activity daily.');
  } else if (bmi > 25) {
    analysis.metrics.weight = {
      status: 'warning',
      message: 'Your BMI indicates you are overweight.'
    };
    totalRiskScore += 10;
    riskFactors++;
    bmiRisk = 10;
    analysis.recommendations.push('Incorporate more fruits and vegetables into your diet.');
    analysis.recommendations.push('Aim for regular physical activity throughout the week.');
  }

  // Additional risk factors
  if (profile.hasHeartCondition) {
    totalRiskScore += 25;
    riskFactors++;
  }

  if (profile.hadHeartAttack) {
    totalRiskScore += 30;
    riskFactors++;
  }

  if (profile.lifestyle.smoker) {
    totalRiskScore += 25;
    riskFactors++;
    analysis.recommendations.push('Consider a smoking cessation program.');
  }

  // Adjust recommendations based on exercise frequency
  if (profile.lifestyle.exerciseFrequency < 2) {
    totalRiskScore += 15;
    riskFactors++;
    analysis.recommendations.push('Increase physical activity to at least 3 days per week.');
  }

  // Calculate final risk score and level
  analysis.riskScore = Math.min(Math.round(totalRiskScore / Math.max(1, riskFactors)), 100);

  if (analysis.riskScore > 60) {
    analysis.riskLevel = 'high';
  } else if (analysis.riskScore > 30) {
    analysis.riskLevel = 'moderate';
  } else {
    analysis.riskLevel = 'low';
  }

  // Generate summary
  if (analysis.riskLevel === 'high') {
    analysis.summary = 'Your health metrics indicate multiple risk factors. We recommend consulting with your healthcare provider for a comprehensive assessment.';
  } else if (analysis.riskLevel === 'moderate') {
    analysis.summary = 'Your health metrics indicate some areas of concern. Making lifestyle changes now can help prevent future health issues.';
  } else {
    analysis.summary = 'Your health metrics are mostly in the normal range. Continue with your healthy lifestyle habits.';
  }

  // Add general recommendations
  if (analysis.recommendations.length === 0) {
    analysis.recommendations.push('Continue your current healthy lifestyle patterns.');
    analysis.recommendations.push('Schedule regular check-ups with your healthcare provider.');
  }

  return analysis;
}
