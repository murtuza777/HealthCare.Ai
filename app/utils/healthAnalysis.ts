import { PatientDetails } from '../components/PatientDetailsForm';

interface HealthAnalysis {
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  riskScore: number;
  recommendations: string[];
  criticalFactors: string[];
  lifestyle: {
    score: number;
    improvements: string[];
  };
  metrics: {
    [key: string]: {
      status: 'normal' | 'warning' | 'critical';
      recommendation?: string;
    };
  };
}

export function analyzeHealthData(data: PatientDetails): HealthAnalysis {
  const analysis: HealthAnalysis = {
    riskLevel: 'low',
    riskScore: 0,
    recommendations: [],
    criticalFactors: [],
    lifestyle: {
      score: 0,
      improvements: [],
    },
    metrics: {},
  };

  // Analyze Blood Pressure
  const systolicStatus = analyzeBP(data.bloodPressureSystolic, 'systolic');
  const diastolicStatus = analyzeBP(data.bloodPressureDiastolic, 'diastolic');
  
  analysis.metrics.bloodPressure = {
    status: getBPStatus(systolicStatus, diastolicStatus),
    recommendation: getBPRecommendation(systolicStatus, diastolicStatus),
  };

  // Analyze Heart Rate
  analysis.metrics.heartRate = analyzeHeartRate(data.heartRate);

  // Analyze Cholesterol
  analysis.metrics.cholesterol = analyzeCholesterol(data.cholesterol);

  // Analyze BMI
  const bmi = calculateBMI(data.weight, data.height);
  analysis.metrics.bmi = analyzeBMI(bmi);

  // Calculate Risk Score
  let riskPoints = 0;

  // Age factor
  riskPoints += data.age >= 60 ? 2 : data.age >= 40 ? 1 : 0;

  // Medical history factors
  if (data.hasHeartCondition) {
    riskPoints += 3;
    analysis.criticalFactors.push('Existing Heart Condition');
  }
  if (data.hadHeartAttack) {
    riskPoints += 4;
    analysis.criticalFactors.push('Previous Heart Attack');
  }
  if (data.familyHistoryOfHeartDisease) {
    riskPoints += 2;
    analysis.criticalFactors.push('Family History');
  }

  // Lifestyle factors
  let lifestyleScore = 10;
  if (data.smoker) {
    riskPoints += 3;
    lifestyleScore -= 3;
    analysis.lifestyle.improvements.push('Consider smoking cessation programs');
  }
  if (data.alcoholConsumption === 'heavy') {
    riskPoints += 2;
    lifestyleScore -= 2;
    analysis.lifestyle.improvements.push('Reduce alcohol consumption');
  }
  if (data.exerciseFrequency < 3) {
    riskPoints += 1;
    lifestyleScore -= 2;
    analysis.lifestyle.improvements.push('Increase physical activity to at least 3 times per week');
  }
  if (data.stressLevel > 7) {
    riskPoints += 1;
    lifestyleScore -= 1;
    analysis.lifestyle.improvements.push('Consider stress management techniques');
  }

  // Metrics factors
  if (analysis.metrics.bloodPressure.status === 'critical') riskPoints += 3;
  if (analysis.metrics.heartRate.status === 'critical') riskPoints += 2;
  if (analysis.metrics.cholesterol.status === 'critical') riskPoints += 2;
  if (analysis.metrics.bmi.status === 'critical') riskPoints += 1;

  // Calculate final risk level
  analysis.riskScore = Math.min(100, riskPoints * 10);
  analysis.riskLevel = getRiskLevel(analysis.riskScore);
  analysis.lifestyle.score = lifestyleScore;

  // Generate recommendations
  generateRecommendations(analysis, data);

  return analysis;
}

function analyzeBP(value: number, type: 'systolic' | 'diastolic'): 'normal' | 'warning' | 'critical' {
  if (type === 'systolic') {
    if (value < 120) return 'normal';
    if (value < 140) return 'warning';
    return 'critical';
  } else {
    if (value < 80) return 'normal';
    if (value < 90) return 'warning';
    return 'critical';
  }
}

function getBPStatus(systolic: string, diastolic: string): 'normal' | 'warning' | 'critical' {
  if (systolic === 'critical' || diastolic === 'critical') return 'critical';
  if (systolic === 'warning' || diastolic === 'warning') return 'warning';
  return 'normal';
}

function getBPRecommendation(systolic: string, diastolic: string): string {
  if (systolic === 'critical' || diastolic === 'critical') {
    return 'Urgent: Consult healthcare provider for blood pressure management';
  }
  if (systolic === 'warning' || diastolic === 'warning') {
    return 'Monitor blood pressure regularly and consider lifestyle changes';
  }
  return 'Maintain healthy lifestyle to keep blood pressure in normal range';
}

function analyzeHeartRate(value: number): { status: 'normal' | 'warning' | 'critical'; recommendation?: string } {
  if (value < 60 || value > 100) {
    return {
      status: 'warning',
      recommendation: 'Monitor heart rate and consult healthcare provider if symptoms occur',
    };
  }
  if (value < 50 || value > 120) {
    return {
      status: 'critical',
      recommendation: 'Seek immediate medical attention for abnormal heart rate',
    };
  }
  return {
    status: 'normal',
    recommendation: 'Maintain healthy activity levels to support heart health',
  };
}

function analyzeCholesterol(value: number): { status: 'normal' | 'warning' | 'critical'; recommendation?: string } {
  if (value < 200) {
    return {
      status: 'normal',
      recommendation: 'Maintain healthy diet and exercise routine',
    };
  }
  if (value < 240) {
    return {
      status: 'warning',
      recommendation: 'Consider dietary changes and increased physical activity',
    };
  }
  return {
    status: 'critical',
    recommendation: 'Consult healthcare provider for cholesterol management',
  };
}

function calculateBMI(weight: number, height: number): number {
  return weight / ((height / 100) * (height / 100));
}

function analyzeBMI(bmi: number): { status: 'normal' | 'warning' | 'critical'; recommendation?: string } {
  if (bmi < 18.5) {
    return {
      status: 'warning',
      recommendation: 'Consider nutritional counseling for healthy weight gain',
    };
  }
  if (bmi < 25) {
    return {
      status: 'normal',
      recommendation: 'Maintain healthy diet and exercise routine',
    };
  }
  if (bmi < 30) {
    return {
      status: 'warning',
      recommendation: 'Consider weight management program',
    };
  }
  return {
    status: 'critical',
    recommendation: 'Consult healthcare provider for weight management plan',
  };
}

function getRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'severe' {
  if (score < 30) return 'low';
  if (score < 50) return 'moderate';
  if (score < 70) return 'high';
  return 'severe';
}

function generateRecommendations(analysis: HealthAnalysis, data: PatientDetails) {
  // Add general recommendations based on risk level
  if (analysis.riskLevel === 'high' || analysis.riskLevel === 'severe') {
    analysis.recommendations.push('Schedule regular check-ups with your healthcare provider');
    analysis.recommendations.push('Consider cardiac rehabilitation program');
  }

  // Add specific recommendations based on metrics
  Object.entries(analysis.metrics).forEach(([metric, data]) => {
    if (data.recommendation) {
      analysis.recommendations.push(data.recommendation);
    }
  });

  // Add lifestyle recommendations
  analysis.recommendations.push(...analysis.lifestyle.improvements);

  // Add medication adherence recommendation if applicable
  if (data.currentMedications.length > 0) {
    analysis.recommendations.push('Maintain strict adherence to prescribed medications');
  }

  // Remove duplicates and limit to top 5 most important recommendations
  analysis.recommendations = [...new Set(analysis.recommendations)].slice(0, 5);
}
