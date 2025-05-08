import { HealthProfile, HealthMetrics, Symptom } from './types';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface HealthAssessmentRequest {
  profile: HealthProfile;
  metrics: HealthMetrics;
  symptoms: Symptom[];
  query: string;
}

export async function assessHealthStatus(data: HealthAssessmentRequest) {
  if (!API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are Dr. Guardian, an advanced AI medical assistant with expertise in all areas of medicine. Respond naturally and conversationally while providing accurate medical guidance. Always maintain medical professionalism and evidence-based advice.

Core Principles:
1. Be warm and empathetic in your responses
2. Use simple language to explain medical concepts
3. Provide detailed but understandable explanations
4. Always consider the patient's full medical context
5. Be proactive in identifying potential health concerns
6. IMPORTANT: You should respond to ANY health-related query, even general ones

Patient's Current Health Profile:
${formatProfileData(data.profile)}

Current Health Metrics:
${formatMetricsData(data.metrics)}

Recent Symptoms:
${formatSymptomsData(data.symptoms)}

Patient's Message: "${data.query}"

Response Guidelines:
1. First, acknowledge the patient's query with empathy
2. If it's a question about any medical topic, provide a clear, accurate, detailed answer
3. If it's about a condition, explain it thoroughly including causes, symptoms, treatments
4. If it's a symptom, analyze it in context of their health profile
5. If it's a general statement, provide relevant health insights
6. Always include actionable recommendations
7. Mention any relevant warning signs or precautions
8. Provide context for why your recommendations matter
9. Flag any concerning patterns in their health metrics

For health metrics analysis:
- Blood pressure ${data.metrics?.bloodPressureSystolic || 120}/${data.metrics?.bloodPressureDiastolic || 80}: interpret this value
- Heart rate ${data.metrics?.heartRate || 70}: interpret this value
- Weight ${data.metrics?.weight || 70}kg: interpret this as appropriate
- Assess if these values might indicate early signs of medical conditions

Remember to:
- Respond conversationally like a real doctor would in an office visit
- Show you understand the patient's concerns
- Explain medical terms in simple language
- Connect your advice to their specific health situation
- Be thorough but not overwhelming
- Include preventive advice when relevant
- Address both immediate concerns and long-term health
- NEVER refuse to answer valid health questions, even if general

Your response should feel like a natural conversation with a knowledgeable, caring doctor who:
- Listens carefully
- Explains clearly
- Shows genuine concern
- Provides practical advice
- Empowers the patient with knowledge
- Encourages healthy choices
- Flags any serious concerns

Format your response in a natural, conversational way while including:
- Personal greeting
- Direct response to their query, regardless of whether it's about general health knowledge or personal metrics
- Relevant medical insights
- Practical recommendations
- Any necessary warnings
- Encouraging closing note

Always end with a clear next step or invitation for more questions.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error('Failed to get response from Gemini API: ' + errorText);
    }

    const result = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };
    
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini API response format:', result);
      throw new Error('Invalid response format from Gemini API');
    }

    const analysis = result.candidates[0].content.parts[0].text;
    
    // Extract key information
    const riskLevel = determineRiskLevel(analysis);
    const needsEmergencyCare = checkEmergencyStatus(analysis);
    const recommendations = extractRecommendations(analysis);
    const mentalHealthSuggestions = extractMentalHealthSuggestions(analysis);

    return {
      analysis,
      riskLevel,
      needsEmergencyCare,
      recommendations,
      mentalHealthSuggestions,
      actions: extractActions(analysis)
    };
  } catch (error) {
    console.error('Error in health assessment:', error);
    throw error;
  }
}

function formatProfileData(profile: HealthProfile): string {
  return `- Medical Conditions: ${profile.conditions.join(', ')}
- Medications: ${profile.medications.map(m => `${m.name} (${m.dosage})`).join(', ')}
- Allergies: ${profile.allergies.join(', ')}
- Family History: ${profile.familyHistory.join(', ')}
- Lifestyle:
  * Exercise: ${profile.lifestyle.exerciseFrequency} times per week
  * Diet: ${profile.lifestyle.diet}
  * Stress Level: ${profile.lifestyle.stressLevel}/10
  * Smoking: ${profile.lifestyle.smoker ? 'Yes' : 'No'}
  * Alcohol: ${profile.lifestyle.alcoholConsumption}`;
}

function formatMetricsData(metrics: HealthMetrics): string {
  return `- Heart Rate: ${metrics.heartRate} BPM
- Blood Pressure: ${metrics.bloodPressureSystolic}/${metrics.bloodPressureDiastolic}
- Cholesterol: ${metrics.cholesterol}
- Weight: ${metrics.weight} kg`;
}

function formatSymptomsData(symptoms: Symptom[]): string {
  return symptoms.map(s => 
    `- ${s.type} (Severity: ${s.severity}/10)
     * Duration: ${s.duration} minutes
     * Description: ${s.description}
     * Accompanied by: ${s.accompaniedBy.join(', ')}`
  ).join('\n');
}

function determineRiskLevel(analysis: string): string {
  const riskIndicators = {
    high: ['immediate attention', 'urgent', 'emergency', 'critical', 'severe'],
    medium: ['moderate', 'concerning', 'elevated', 'attention needed'],
    low: ['mild', 'normal', 'good', 'healthy', 'stable']
  };

  const analysisLower = analysis.toLowerCase();
  
  if (riskIndicators.high.some(indicator => analysisLower.includes(indicator))) {
    return 'high';
  }
  if (riskIndicators.medium.some(indicator => analysisLower.includes(indicator))) {
    return 'medium';
  }
  return 'low';
}

function checkEmergencyStatus(analysis: string): boolean {
  const emergencyPhrases = [
    'immediate medical attention',
    'emergency',
    'call 911',
    'urgent care',
    'seek help immediately',
    'critical condition'
  ];
  
  return emergencyPhrases.some(phrase => 
    analysis.toLowerCase().includes(phrase.toLowerCase())
  );
}

function extractRecommendations(analysis: string): string[] {
  const recommendations = [];
  const lines = analysis.split('\n');
  let inRecommendationsSection = false;

  for (const line of lines) {
    if (line.toLowerCase().includes('recommendation') || 
        line.toLowerCase().includes('suggested') ||
        line.toLowerCase().includes('advised')) {
      inRecommendationsSection = true;
      continue;
    }

    if (inRecommendationsSection && line.trim().startsWith('-')) {
      recommendations.push(line.trim().substring(1).trim());
    }

    if (inRecommendationsSection && line.trim() === '') {
      inRecommendationsSection = false;
    }
  }

  return recommendations;
}

function extractMentalHealthSuggestions(analysis: string): string[] {
  const suggestions = [];
  const lines = analysis.split('\n');
  let inMentalHealthSection = false;

  for (const line of lines) {
    if (line.toLowerCase().includes('mental health') || 
        line.toLowerCase().includes('emotional well-being') ||
        line.toLowerCase().includes('stress management')) {
      inMentalHealthSection = true;
      continue;
    }

    if (inMentalHealthSection && line.trim().startsWith('-')) {
      suggestions.push(line.trim().substring(1).trim());
    }

    if (inMentalHealthSection && line.trim() === '') {
      inMentalHealthSection = false;
    }
  }

  return suggestions;
}

function extractActions(analysis: string): { type: string; priority: string; description: string; }[] {
  const actions = [];
  const actionKeywords = [
    'immediately', 'urgently', 'soon', 'should', 'consider', 'recommended', 'advised'
  ];

  const lines = analysis.split('\n');
  for (const line of lines) {
    for (const keyword of actionKeywords) {
      if (line.toLowerCase().includes(keyword)) {
        actions.push({
          type: determineActionType(line),
          priority: determinePriority(keyword),
          description: line.trim()
        });
        break;
      }
    }
  }

  return actions;
}

function determineActionType(action: string): string {
  if (action.match(/mental|stress|anxiety|depression|mood/i)) return 'mental_health';
  if (action.match(/call|contact|consult|see|visit/i)) return 'medical_consultation';
  if (action.match(/take|medication|medicine|pill/i)) return 'medication';
  if (action.match(/exercise|activity|walk|fitness/i)) return 'exercise';
  if (action.match(/diet|eat|food|nutrition/i)) return 'diet';
  if (action.match(/monitor|check|measure|track/i)) return 'monitoring';
  if (action.match(/sleep|rest|fatigue/i)) return 'sleep';
  return 'general';
}

function determinePriority(keyword: string): string {
  switch (keyword.toLowerCase()) {
    case 'immediately':
    case 'urgently':
      return 'high';
    case 'soon':
    case 'should':
      return 'medium';
    default:
      return 'low';
  }
}
