import { HealthProfile, HealthMetrics, Symptom } from './types';

const API_KEY = 'AIzaSyAE-vlLR8G7KvGh8r3xAKDs1o5YnYptGlE';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface HealthAssessmentRequest {
  profile: HealthProfile;
  metrics: HealthMetrics;
  symptoms: Symptom[];
  query: string;
}

export async function assessHealthStatus(data: HealthAssessmentRequest) {
  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `As an AI medical assistant, analyze the following health data and provide recommendations:
            
Patient Profile:
- Heart Condition: ${data.profile.hasHeartCondition ? 'Yes' : 'No'}
- Previous Heart Attack: ${data.profile.hadHeartAttack ? 'Yes' : 'No'}
- Last Heart Attack: ${data.profile.lastHeartAttack ? data.profile.lastHeartAttack.toISOString() : 'N/A'}
- Conditions: ${data.profile.conditions.join(', ')}
- Medications: ${data.profile.medications.map(m => m.name).join(', ')}

Current Vitals:
- Heart Rate: ${data.metrics.heartRate} BPM
- Blood Pressure: ${data.metrics.bloodPressureSystolic}/${data.metrics.bloodPressureDiastolic}
- Cholesterol: ${data.metrics.cholesterol}

Recent Symptoms:
${data.symptoms.map(s => `- ${s.type} (Severity: ${s.severity}/10)`).join('\n')}

User Query: ${data.query}

Provide a detailed analysis including:
1. Current health status assessment
2. Risk level evaluation (specify as "Risk Level: [Low/Medium/High]")
3. Specific recommendations
4. Whether immediate medical attention is needed
5. Lifestyle and medication advice

Format the response with clear sections and bullet points.`
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
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
      throw new Error('Health assessment API error: ' + await response.text());
    }

    const result = await response.json();
    
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid API response format');
    }

    // Parse and structure the response
    const analysis = result.candidates[0].content.parts[0].text;
    
    // Extract key information using regex
    const riskLevel = analysis.match(/Risk Level:\s*(Low|Medium|High)/i)?.[1]?.toLowerCase() || 'unknown';
    const needsEmergencyCare = analysis.toLowerCase().includes('immediate medical attention') || 
                              analysis.toLowerCase().includes('emergency');

    // Extract recommendations (lines starting with - or •)
    const recommendations = analysis
      .split('\n')
      .filter(line => line.trim().match(/^[-•]\s+/))
      .map(line => line.trim());

    return {
      analysis,
      riskLevel,
      needsEmergencyCare,
      recommendations,
      actions: extractActions(analysis)
    };
  } catch (error) {
    console.error('Error in health assessment:', error);
    throw error;
  }
}

function extractActions(analysis: string): { type: string; priority: string; description: string; }[] {
  const actions = [];
  const actionKeywords = [
    'immediately', 'urgently', 'soon', 'should', 'consider', 'recommended'
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
  if (action.match(/call|contact|consult|see|visit/i)) return 'medical_consultation';
  if (action.match(/take|medication|medicine|pill/i)) return 'medication';
  if (action.match(/exercise|activity|walk/i)) return 'exercise';
  if (action.match(/diet|eat|food|nutrition/i)) return 'diet';
  if (action.match(/monitor|check|measure|track/i)) return 'monitoring';
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
