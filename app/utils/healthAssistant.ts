import { HealthProfile, HealthMetrics, Symptom, MedicalReport, Message } from './types';

// Use Gemini API key instead of DeepSeek
// const DEEPSEEK_API_KEY = "sk-52dade5aa02a41d1b9c192d4779e5b80";
// const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyD2XIQTo6DQ08XMLm1wjwU91iaKg-7JCuE";
// Updated to use Gemini 2.0 Flash model
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface HealthAssistantRequest {
  profile?: HealthProfile | null;
  metrics?: HealthMetrics | null;
  symptoms?: Symptom[] | null;
  medicalReports?: MedicalReport[] | null;
  messageHistory?: Message[] | null;
  query: string;
}

interface HealthAssistantResponse {
  answer: string;
  isEmergency: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  preventiveAdvice: string[];
  followUpQuestions: string[];
}

// Deepseek API response types
interface DeepseekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Define interfaces for Gemini API response
interface GeminiResponsePart {
  text: string;
}

interface GeminiResponseContent {
  parts: GeminiResponsePart[];
  role?: string;
}

interface GeminiResponseCandidate {
  content: GeminiResponseContent;
  finishReason?: string;
  index?: number;
  safetyRatings?: Array<any>;
}

interface GeminiResponse {
  candidates: GeminiResponseCandidate[];
  promptFeedback?: any;
}

/**
 * Health assistant that provides useful responses based on user's health data
 * This version prioritizes the Gemini API but falls back to local responses if needed
 */
export async function getHealthAssistantResponse(data: HealthAssistantRequest): Promise<HealthAssistantResponse> {
  let retryCount = 0;
  const maxRetries = 2;
  const baseDelay = 1000; // 1 second

  while (retryCount <= maxRetries) {
    try {
      // Attempt to use the Gemini API for more personalized, AI-powered responses
      console.log(`API attempt ${retryCount + 1}/${maxRetries + 1}`);
      const aiResponse = await callGeminiAPI(data);
      return aiResponse;
    } catch (error) {
      console.error(`Error calling Gemini API (attempt ${retryCount + 1}):`, error);
      
      // Check if it's a rate limit error (429)
      if (error instanceof Error && error.message.includes('429')) {
        if (retryCount < maxRetries) {
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000;
          console.log(`Rate limit hit. Retrying in ${Math.round(delay / 1000)} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }
      }
      
      // If we've exhausted retries or it's not a rate limit error, fall back to the local system
      console.log('Falling back to local response system');
      return getMockHealthResponse(data);
    }
  }
  
  // This should not be reached due to the while loop, but TypeScript needs a return
  return getMockHealthResponse(data);
}

/**
 * Call the Gemini API to get personalized health responses
 */
async function callGeminiAPI(data: HealthAssistantRequest): Promise<HealthAssistantResponse> {
  const messages = buildContextualPrompt(data);

  // Convert the messages to Gemini API format
  const systemMessage = messages[0];
  const userMessages = messages.slice(1);
  
  // Format the content for Gemini API - update to match the expected format
  const combinedContent = {
    contents: [
      {
        parts: [
          {
            text: systemMessage.content
          }
        ],
        role: "system"
      },
      {
        parts: [
          {
            text: userMessages.map(msg => 
              `${msg.role === 'assistant' ? 'AI' : 'User'}: ${msg.content}`
            ).join("\n")
          }
        ],
        role: "user"
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048
    }
  };
  
  try {
    console.log("Calling Gemini API with URL:", GEMINI_API_URL);
    console.log("Using API key:", GEMINI_API_KEY.substring(0, 5) + "..." + GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4));
    console.log("Request structure:", JSON.stringify(combinedContent).substring(0, 200) + "...");
    
    // Add timestamps for performance tracking
    const startTime = Date.now();
    console.log("API call started at:", new Date(startTime).toISOString());
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(combinedContent)
    });

    const endTime = Date.now();
    console.log("API call completed in:", (endTime - startTime) / 1000, "seconds");
    console.log("Response status:", response.status, response.statusText);
    
    // Check the content type to help with debugging
    const contentType = response.headers.get('content-type');
    console.log("Response content type:", contentType);

    // Handle specific error cases more gracefully
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorText = errorData ? JSON.stringify(errorData) : await response.text();
      
      console.error("Gemini API failed with status:", response.status);
      console.error("Error details:", errorText);
      
      // Check for specific error types
      if (response.status === 403) {
        console.error('Gemini API access denied. Please check your API key.');
        throw new Error('Gemini API access denied: Please check your API key');
      }
      
      if (response.status === 429) {
        console.error('Gemini API rate limit exceeded. Try again later or switch to another model.');
        throw new Error('Rate limit exceeded: Gemini API is temporarily unavailable due to high usage');
      }
      
      throw new Error(`Gemini API request failed: ${response.status} ${errorText}`);
    }

    console.log("Parsing response JSON...");
    const responseData = await response.json() as GeminiResponse;
    console.log("Gemini API response received successfully");
    
    // Enhanced logging of the response structure
    console.log("Response has candidates:", !!responseData.candidates);
    if (responseData.candidates) {
      console.log("Number of candidates:", responseData.candidates.length);
      if (responseData.candidates.length > 0) {
        console.log("First candidate has content:", !!responseData.candidates[0].content);
        if (responseData.candidates[0].content) {
          console.log("Content has parts:", !!responseData.candidates[0].content.parts);
          if (responseData.candidates[0].content.parts) {
            console.log("Number of parts:", responseData.candidates[0].content.parts.length);
          }
        }
      }
    }
    
    // Check the structure of the response based on the updated API
    if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
      console.error("Invalid response format from Gemini API:", JSON.stringify(responseData).substring(0, 200));
      throw new Error('Invalid response format from Gemini API');
    }
    
    // Extract the text from the updated response structure
    const contentParts = responseData.candidates[0].content.parts;
    const content = contentParts && contentParts.length > 0 ? contentParts[0].text : '';
    
    if (!content) {
      console.error("No text content in Gemini API response");
      throw new Error('No text content in Gemini API response');
    }
    
    console.log("Successfully extracted text content from Gemini response");
    console.log("Content length:", content.length);
    console.log("Content preview:", content.substring(0, 100) + "...");
    
    // Parse the AI response - it should be in JSON format based on our system prompt
    try {
      // First try direct JSON parsing
      console.log("Attempting to parse content as JSON...");
      const parsedResponse = JSON.parse(content) as HealthAssistantResponse;
      console.log("Successfully parsed response as JSON");
      return parsedResponse;
    } catch (parseError) {
      console.error("JSON parse error:", parseError instanceof Error ? parseError.message : "Unknown error");
      // If direct parsing fails, try to extract JSON from text
      try {
        console.log("Attempting to extract JSON from response text...");
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          console.log("JSON pattern found, attempting to parse...");
          const parsedResponse = JSON.parse(jsonStr) as HealthAssistantResponse;
          console.log("Successfully parsed extracted JSON");
          return parsedResponse;
        } else {
          console.error("Could not extract JSON from response");
          throw new Error('Could not extract JSON from response');
        }
      } catch (extractError) {
        console.error('Error extracting JSON from response:', extractError);
        console.log("Falling back to creating structured response from text content");
        
        // If all parsing fails, create a structured response from the text content
        return {
          answer: content,
          isEmergency: content.toLowerCase().includes('emergency') || 
                      content.toLowerCase().includes('immediate medical attention') ||
                      content.toLowerCase().includes('call 911'),
          riskLevel: determineRiskLevel(content),
          recommendations: extractRecommendations(content),
          preventiveAdvice: extractPreventiveAdvice(content),
          followUpQuestions: generateFollowUpQuestions(data.query)
        };
      }
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Helper function to determine risk level from text
 */
function determineRiskLevel(text: string): 'low' | 'medium' | 'high' {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('emergency') || 
      lowerText.includes('immediate medical attention') ||
      lowerText.includes('call 911') ||
      lowerText.includes('severe') && (lowerText.includes('risk') || lowerText.includes('condition'))) {
    return 'high';
  }
  
  if (lowerText.includes('concerning') || 
      lowerText.includes('moderate risk') ||
      lowerText.includes('should consult') ||
      lowerText.includes('consult your doctor')) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Extract recommendations from text content
 */
function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  // Look for sections that might contain recommendations
  const sections = text.split(/\n\n|\r\n\r\n/);
  
  for (const section of sections) {
    if (section.toLowerCase().includes('recommend') || 
        section.toLowerCase().includes('advised') ||
        section.toLowerCase().includes('should') ||
        section.toLowerCase().includes('suggestion')) {
      
      // Look for bullet points or numbered lists - fixed regex to remove 's' flag
      const bulletPoints = section.match(/[•\-\*]\s+(.*?)(?=\n[•\-\*]|\n\n|$)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const cleaned = point.replace(/^[•\-\*]\s+/, '').trim();
          if (cleaned) recommendations.push(cleaned);
        });
        continue;
      }
      
      // Look for numbered lists - fixed regex to remove 's' flag
      const numberedPoints = section.match(/\d+\.\s+(.*?)(?=\n\d+\.|\n\n|$)/g);
      if (numberedPoints) {
        numberedPoints.forEach(point => {
          const cleaned = point.replace(/^\d+\.\s+/, '').trim();
          if (cleaned) recommendations.push(cleaned);
        });
        continue;
      }
      
      // If no structured list, just add the section
      if (recommendations.length === 0) {
        recommendations.push(section.trim());
      }
    }
  }
  
  // If still no recommendations found, extract sentences with recommendation keywords
  if (recommendations.length === 0) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('recommend') || 
          sentence.toLowerCase().includes('should') ||
          sentence.toLowerCase().includes('advised') ||
          sentence.toLowerCase().includes('important to')) {
        recommendations.push(sentence.trim());
      }
    }
  }
  
  // Limit and clean recommendations
  return recommendations
    .slice(0, 5)
    .map(rec => rec.replace(/\n/g, ' ').trim())
    .filter(rec => rec.length > 10 && rec.length < 100);
}

/**
 * Extract preventive advice from text content
 */
function extractPreventiveAdvice(text: string): string[] {
  const advice: string[] = [];
  
  // Look for sections about prevention
  const sections = text.split(/\n\n|\r\n\r\n/);
  
  for (const section of sections) {
    if (section.toLowerCase().includes('prevent') || 
        section.toLowerCase().includes('avoid') ||
        section.toLowerCase().includes('reduce risk') ||
        section.toLowerCase().includes('lifestyle')) {
      
      // Look for bullet points - fixed regex to remove 's' flag
      const bulletPoints = section.match(/[•\-\*]\s+(.*?)(?=\n[•\-\*]|\n\n|$)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const cleaned = point.replace(/^[•\-\*]\s+/, '').trim();
          if (cleaned) advice.push(cleaned);
        });
        continue;
      }
      
      // Look for numbered lists - fixed regex to remove 's' flag
      const numberedPoints = section.match(/\d+\.\s+(.*?)(?=\n\d+\.|\n\n|$)/g);
      if (numberedPoints) {
        numberedPoints.forEach(point => {
          const cleaned = point.replace(/^\d+\.\s+/, '').trim();
          if (cleaned) advice.push(cleaned);
        });
        continue;
      }
    }
  }
  
  // If no specific preventive advice found, extract sentences with prevention keywords
  if (advice.length === 0) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('prevent') || 
          sentence.toLowerCase().includes('avoid') ||
          sentence.toLowerCase().includes('reduce risk')) {
        advice.push(sentence.trim());
      }
    }
  }
  
  // Limit and clean advice
  return advice
    .slice(0, 5)
    .map(adv => adv.replace(/\n/g, ' ').trim())
    .filter(adv => adv.length > 10 && adv.length < 100);
}

/**
 * Generate follow-up questions based on the initial query
 */
function generateFollowUpQuestions(query: string): string[] {
  // Base questions that are useful for most medical inquiries
  const baseQuestions = [
    "What lifestyle changes can help with this condition?",
    "Are there any warning signs I should watch for?",
    "How is this typically diagnosed?",
    "What preventive measures are recommended?",
    "What treatment options are available?"
  ];
  
  // Add query-specific questions
  if (query.toLowerCase().includes('pain')) {
    return [
      "What might be causing this pain?",
      "When should I seek medical attention for this pain?",
      "What pain management techniques might help?",
      "Could this pain be related to a serious condition?",
      "What tests might a doctor order to diagnose the cause?"
    ];
  }
  
  if (query.toLowerCase().includes('medication') || query.toLowerCase().includes('drug')) {
    return [
      "What are the common side effects?",
      "Are there any serious side effects I should watch for?",
      "How does this medication interact with others I'm taking?",
      "What should I do if I miss a dose?",
      "Are there lifestyle modifications I should make while taking this?"
    ];
  }
  
  if (query.toLowerCase().includes('diet') || query.includes('nutrition')) {
    return [
      "What foods should I incorporate more of?",
      "Are there specific foods I should avoid?",
      "How might my diet affect my current health conditions?",
      "What dietary changes could help with my symptoms?",
      "Should I consider any supplements?"
    ];
  }
  
  return baseQuestions;
}

/**
 * Generate a mock health response based on the user's query and health data
 * This provides useful responses even without API access
 */
function getMockHealthResponse(data: HealthAssistantRequest): HealthAssistantResponse {
  const query = data.query.toLowerCase();
  const healthProfile = data.profile || null;
  const healthMetrics = data.metrics || null;
  const symptoms = data.symptoms || [];
  const medicalReports = data.medicalReports || [];
  
  console.log("Generating local response for query:", query);
  console.log("Available health profile data:", !!healthProfile);
  console.log("Available metrics data:", !!healthMetrics);
  console.log("Number of symptoms:", symptoms.length);
  console.log("Number of medical reports:", medicalReports.length);
  
  // Check for blood pressure risk
  let bpRisk = "normal";
  if (healthMetrics) {
    const systolic = healthMetrics.bloodPressureSystolic;
    const diastolic = healthMetrics.bloodPressureDiastolic;
    
    if (systolic && diastolic) {
      if (systolic >= 140 || diastolic >= 90) {
        bpRisk = "high";
      } else if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
        bpRisk = "elevated";
      }
    }
  }
  
  // Generic question handling for any medical question
  if (query.startsWith("what is") || 
      query.startsWith("how does") || 
      query.startsWith("can you explain") || 
      query.startsWith("tell me about")) {
    
    // Extract the topic from the question
    let topic = "";
    if (query.startsWith("what is")) {
      topic = query.replace("what is", "").trim();
    } else if (query.startsWith("how does")) {
      topic = query.replace("how does", "").trim();
    } else if (query.startsWith("can you explain")) {
      topic = query.replace("can you explain", "").trim();
    } else if (query.startsWith("tell me about")) {
      topic = query.replace("tell me about", "").trim();
    }
    
    if (topic) {
      console.log("Detected general knowledge question about:", topic);
      
      // Handle common health topics
      if (topic.includes("cancer") || topic.includes("tumor") || topic.includes("oncology")) {
        return getCancerInformationResponse();
      }
      
      if (topic.includes("diabetes") || topic.includes("blood sugar") || topic.includes("glucose")) {
        return getDiabetesInformationResponse(healthMetrics);
      }
      
      if (topic.includes("blood pressure") || topic.includes("hypertension")) {
        return getBloodPressureInformationResponse(healthMetrics);
      }
      
      if (topic.includes("heart disease") || topic.includes("cardiac") || topic.includes("cardiovascular")) {
        return getHeartDiseaseInformationResponse(healthProfile, healthMetrics);
      }
      
      if (topic.includes("cholesterol") || topic.includes("lipids")) {
        return getCholesterolInformationResponse(healthMetrics);
      }
      
      if (topic.includes("exercise") || topic.includes("physical activity") || topic.includes("working out")) {
        return getExerciseInformationResponse(healthProfile);
      }
      
      if (topic.includes("nutrition") || topic.includes("diet") || topic.includes("food")) {
        return getDietInformationResponse(healthProfile);
      }
      
      if (topic.includes("medication") || topic.includes("medicine") || topic.includes("drug")) {
        return getMedicationInformationResponse(healthProfile);
      }
      
      // For any other topics, provide a generic response
      return getGenericHealthInformationResponse(topic);
    }
  }
  
  // First, check if this is a direct question about a medical condition, disease, or term
  const medicalTerms = [
    'cancer', 'diabetes', 'hypertension', 'heart disease', 'stroke', 'alzheimer', 'dementia', 
    'asthma', 'copd', 'arthritis', 'osteoporosis', 'depression', 'anxiety', 'adhd', 'autism',
    'flu', 'influenza', 'covid', 'coronavirus', 'infection', 'virus', 'bacterial', 'antibiotic',
    'cholesterol', 'blood pressure', 'glucose', 'insulin', 'thyroid', 'kidney', 'liver', 'lung',
    'heart attack', 'cardiac', 'brain', 'nerve', 'muscle', 'joint', 'bone', 'skin', 'rash'
  ];
  
  const matchedTerm = medicalTerms.find(term => query.includes(term));
  
  if (matchedTerm) {
    return getMedicalConditionResponse(matchedTerm, healthProfile, healthMetrics);
  }
  
  // Next, check if this is about the user's health data specifically
  const personalDataTerms = [
    'my health', 'my data', 'my metrics', 'my vitals', 'my blood pressure', 
    'my heart rate', 'my cholesterol', 'my weight', 'my bmi', 'my risk'
  ];
  
  const isPersonalDataQuery = personalDataTerms.some(term => query.includes(term));
  
  if (isPersonalDataQuery) {
    return getPersonalHealthDataResponse(healthProfile, healthMetrics, symptoms, medicalReports);
  }
  
  // Check for symptom queries
  if (query.includes('symptom') || query.includes('feeling') || query.includes('pain') || 
      query.includes('ache') || query.includes('discomfort') || query.includes('hurt')) {
    return getSymptomBasedResponse(query, symptoms, healthProfile);
  }
  
  // Check for specific health advice categories
  if (query.includes('exercise') || query.includes('workout') || query.includes('fitness') || query.includes('active')) {
    return getExerciseAdviceResponse(healthProfile, healthMetrics);
  }
  
  if (query.includes('diet') || query.includes('nutrition') || query.includes('food') || 
      query.includes('eat') || query.includes('meal')) {
    return getDietaryAdviceResponse(healthProfile, healthMetrics);
  }
  
  if (query.includes('sleep') || query.includes('insomnia') || query.includes('rest') || 
      query.includes('tired') || query.includes('fatigue')) {
    return getSleepAdviceResponse(healthProfile);
  }
  
  if (query.includes('stress') || query.includes('anxiety') || query.includes('worry') || 
      query.includes('mental health') || query.includes('depression')) {
    return getMentalHealthResponse(healthProfile);
  }
  
  if (query.includes('medication') || query.includes('drug') || query.includes('medicine') || 
      query.includes('pill') || query.includes('prescription')) {
    return getMedicationResponse(healthProfile);
  }
  
  // Check for risk assessment queries
  if (query.includes('risk') || query.includes('chance') || query.includes('likelihood') || 
      query.includes('prevention') || query.includes('prevent')) {
    return getRiskAssessmentResponse(healthProfile, healthMetrics);
  }
  
  // Check for lab results / medical reports
  if (query.includes('lab') || query.includes('test') || query.includes('result') || 
      query.includes('report') || query.includes('scan')) {
    return getMedicalReportResponse(medicalReports);
  }
  
  // If none of the above, provide a general response based on available health data
  return getGeneralHealthResponse(healthProfile, healthMetrics, query);
}

// Helper function for queries about specific medical conditions
function getMedicalConditionResponse(condition: string, profile: HealthProfile | null | undefined, metrics: HealthMetrics | null): HealthAssistantResponse {
  // Create personalized responses based on medical conditions
  switch(condition) {
    case 'diabetes':
      return {
        answer: `Diabetes is a chronic metabolic disorder characterized by elevated blood glucose levels due to either insufficient insulin production or the body's inability to effectively use insulin.

There are three main types of diabetes:
1. Type 1 Diabetes: An autoimmune condition where the body attacks insulin-producing cells
2. Type 2 Diabetes: The most common form, often associated with lifestyle factors
3. Gestational Diabetes: Occurs during pregnancy

${metrics && typeof metrics.cholesterol !== 'undefined' && metrics.cholesterol > 200 ? 
  "Based on your elevated cholesterol levels, you may have an increased risk for Type 2 diabetes. It's important to discuss this with your healthcare provider." : 
  ""}
${profile?.lifestyle?.exerciseFrequency !== undefined && profile.lifestyle.exerciseFrequency < 3 ? 
  "Your current exercise frequency is below recommendations, which can increase diabetes risk. Consider gradually increasing physical activity." : 
  ""}

Key management strategies include monitoring blood glucose, maintaining a healthy diet, regular physical activity, and medication if prescribed.`,
        isEmergency: false,
        riskLevel: "low",
        recommendations: [
          "Maintain a balanced diet low in refined carbohydrates",
          "Exercise regularly (aim for 150 minutes weekly)",
          "Monitor your blood glucose if recommended by your doctor",
          "Maintain a healthy weight"
        ],
        preventiveAdvice: [
          "Choose whole grains over refined carbohydrates",
          "Limit added sugars in your diet",
          "Stay physically active with at least 150 minutes of exercise weekly",
          "Maintain a healthy weight"
        ],
        followUpQuestions: [
          "What are the early warning signs of diabetes?",
          "How can I prevent type 2 diabetes?",
          "What foods should I avoid to manage blood sugar?",
          "How is diabetes diagnosed?"
        ]
      };
      
    case 'hypertension':
    case 'blood pressure': 
      const bpStatus = metrics ? 
        interpretBP(metrics.bloodPressureSystolic, metrics.bloodPressureDiastolic) : 
        "I don't have your current blood pressure readings";
        
      return {
        answer: `High blood pressure (hypertension) is a common condition where the long-term force of blood against your artery walls is high enough that it may eventually cause health problems.

Normal blood pressure is less than 120/80 mm Hg. If your blood pressure is consistently above 130/80 mm Hg, you have hypertension.

Management typically involves lifestyle changes (healthy diet, regular exercise, limiting alcohol and sodium) and medications when necessary.`,
        isEmergency: metrics && (metrics.bloodPressureSystolic > 180 || metrics.bloodPressureDiastolic > 120) ? true : false,
        riskLevel: metrics && (metrics.bloodPressureSystolic > 140 || metrics.bloodPressureDiastolic > 90) ? "medium" : "low",
        recommendations: [
          "Monitor your blood pressure regularly",
          "Limit sodium intake to less than 2,300mg daily",
          "Engage in regular physical activity",
          "Manage stress through relaxation techniques"
        ],
        preventiveAdvice: [
          "Follow the DASH diet (rich in fruits, vegetables, and low-fat dairy)",
          "Limit alcohol consumption",
          "Maintain a healthy weight",
          "Quit smoking if applicable"
        ],
        followUpQuestions: [
          "How often should I check my blood pressure?",
          "What foods should I avoid for healthy blood pressure?",
          "What exercises are best for lowering blood pressure?",
          "When should I consider medication for blood pressure?"
        ]
      };
    
    // Add more cases for other conditions as needed
    
    default:
      return {
        answer: `${condition.charAt(0).toUpperCase() + condition.slice(1)} is an important health topic. While I don't have specific personalized information about this condition in relation to your health profile, I can provide general information.

To get detailed, personalized guidance about ${condition} and how it might relate to your specific health situation, I recommend consulting with your healthcare provider.

Would you like me to provide general information about ${condition}, or would you prefer to focus on another aspect of your health that I have more personalized data for?`,
        isEmergency: false,
        riskLevel: "low",
        recommendations: [
          "Consult with your healthcare provider for personalized advice",
          "Keep track of any symptoms or concerns to discuss with your doctor",
          "Consider researching reputable medical sources like Mayo Clinic or CDC"
        ],
        preventiveAdvice: [
          "Maintain regular health check-ups",
          "Follow a balanced diet and regular exercise routine",
          "Get adequate sleep and manage stress levels",
          "Avoid tobacco and limit alcohol consumption"
        ],
        followUpQuestions: [
          `What are the most common symptoms of ${condition}?`,
          `How is ${condition} typically diagnosed?`,
          `What lifestyle factors affect ${condition}?`,
          `What treatments are available for ${condition}?`
        ]
      };
  }
}

// Helper function for queries about personal health data
function getPersonalHealthDataResponse(profile: HealthProfile | null, metrics: HealthMetrics | null, symptoms: Symptom[], reports: MedicalReport[]): HealthAssistantResponse {
  // Create a comprehensive response based on all available health data
  let bpDescription = "not recorded";
  let bpStatus = "unknown";
  
  if (metrics && metrics.bloodPressureSystolic && metrics.bloodPressureDiastolic) {
    bpDescription = `${metrics.bloodPressureSystolic}/${metrics.bloodPressureDiastolic} mmHg`;
    bpStatus = interpretBP(metrics.bloodPressureSystolic, metrics.bloodPressureDiastolic);
  }
  
  const hasRecentSymptoms = symptoms.length > 0;
  const hasRecentReports = reports.length > 0;
  
  const riskFactors = [];
  
  if (metrics && (metrics.bloodPressureSystolic > 130 || metrics.bloodPressureDiastolic > 80)) {
    riskFactors.push("elevated blood pressure");
  }
  
  if (metrics && metrics.heartRate > 100) {
    riskFactors.push("elevated heart rate");
  }
  
  if (metrics && metrics.cholesterol > 200) {
    riskFactors.push("elevated cholesterol");
  }
  
  if (profile?.lifestyle?.smoker) {
    riskFactors.push("smoking");
  }
  
  if (profile?.lifestyle?.alcoholConsumption === 'heavy') {
    riskFactors.push("high alcohol consumption");
  }
  
  if (profile?.lifestyle?.exerciseFrequency !== undefined && profile.lifestyle.exerciseFrequency < 3) {
    riskFactors.push("low physical activity");
  }
  
  return {
    answer: `Based on your health data, here's a summary of your current health status:

Vital Signs:
• Blood Pressure: ${bpDescription} (${bpStatus})
• Heart Rate: ${metrics?.heartRate || 'not recorded'} BPM
• Cholesterol: ${metrics?.cholesterol || 'not recorded'} mg/dL
• Weight: ${metrics?.weight || 'not recorded'} kg

${hasRecentSymptoms ? `Recent Symptoms: 
${symptoms.slice(0, 3).map(s => `• ${s.type} (Severity: ${s.severity}/10, reported ${new Date(s.timestamp).toLocaleDateString()})`).join('\n')}` : 'No recent symptoms recorded.'}

${hasRecentReports ? `Recent Medical Reports:
${reports.slice(0, 2).map(r => `• ${r.type} (${new Date(r.date).toLocaleDateString()}) from ${r.facility}`).join('\n')}` : 'No recent medical reports available.'}

${riskFactors.length > 0 ? `Potential Health Risk Factors:
${riskFactors.map(r => `• ${r}`).join('\n')}` : 'No significant risk factors identified based on available data.'}

Would you like more detailed information about any specific aspect of your health data?`,
    isEmergency: false,
    riskLevel: riskFactors.length > 2 ? "medium" : "low",
    recommendations: [
      "Continue monitoring your vital signs regularly",
      "Discuss any concerning trends with your healthcare provider",
      "Update your health profile with any new diagnoses or medications",
      "Schedule recommended health screenings for your age and gender"
    ],
    preventiveAdvice: [
      "Maintain a balanced diet rich in fruits, vegetables, and whole grains",
      "Aim for at least 150 minutes of moderate exercise weekly",
      "Ensure adequate sleep (7-9 hours nightly)",
      "Practice stress management techniques like meditation or deep breathing"
    ],
    followUpQuestions: [
      "What do my blood pressure readings mean?",
      "How can I improve my cholesterol levels?",
      "What health screenings should I schedule?",
      "How can I reduce my health risk factors?"
    ]
  };
}

// Helper function to interpret blood pressure readings
function interpretBP(systolic: number, diastolic: number): string {
  if (systolic >= 180 || diastolic >= 120) {
    return "in hypertensive crisis range - seek immediate medical attention";
  } else if (systolic >= 140 || diastolic >= 90) {
    return "in stage 2 hypertension range";
  } else if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
    return "in stage 1 hypertension range";
  } else if (systolic >= 120 && systolic < 130 && diastolic < 80) {
    return "elevated";
  } else {
    return "within normal range";
  }
}

function buildContextualPrompt(data: HealthAssistantRequest): any[] {
  // Extract previous context from message history
  const previousMessages = data.messageHistory
    ? data.messageHistory
        .filter(m => m.type !== 'emergency') // Skip emergency messages
        .slice(-10) // Only include last 10 messages for context
        .map(m => ({
          role: m.isBot ? "assistant" : "user",
          content: m.text
        }))
    : [];
  
  // System prompt with guidelines
  const systemMessage = {
    role: "system",
    content: `You are Dr. Guardian, a helpful and knowledgeable AI assistant. Your primary expertise is in all areas of medicine, and you are part of the Health Guardian AI system.
Your main goal is to help users manage their health and answer their medical questions with detailed, accurate, and empathetic information.

However, you are also capable of answering general knowledge questions or engaging in conversation on a variety of topics, much like a versatile AI assistant (e.g., ChatGPT).
When the query is health-related, or if health context (like patient profile, symptoms, etc.) is provided with the query, you MUST leverage your medical expertise and any available user's health data to provide personalized and relevant health advice.
For non-medical questions, or if no health context is pertinent, provide a helpful and informative general response.

IMPORTANT GUIDELINES WHEN ACTING AS A MEDICAL ASSISTANT (when query is health-related):
1. Focus on providing clear, accurate, evidence-based medical information presented in a conversational, empathetic manner.
2. You should answer ANY healthcare question in comprehensive detail, with a focus on medical expertise.
3. Include relevant medical information, explanations of medical terms, treatment options, and preventive measures.
4. Provide nuanced explanations of medical conditions, diseases, treatments, and health concepts.
5. When discussing symptoms, provide detailed information about potential causes, when to seek medical attention, and self-care options.
6. Treat the user as if you're a knowledgeable doctor having a conversation with a patient.
7. Feel free to include detailed medical information, explanations of mechanisms, and medical terminology (with explanations).
8. Do not be vague or generic - provide specific, actionable information.
9. NEVER respond with "I'm unable to provide medical advice" or similar disclaimers. Instead, provide comprehensive information while noting that you're not replacing professional medical care.
10. Always note that while you're providing detailed information, the user should consult healthcare providers for personalized medical advice and diagnosis.
11. When appropriate, incorporate the user's health profile data in your response, but always answer the question first and foremost.

Your response MUST ALWAYS be returned as a VALID JSON object with these fields, for ALL types of questions:
- answer: (string) Your complete, detailed answer to the query.
- isEmergency: (boolean) True if the situation requires immediate medical attention (primarily for health queries). Default to false for general non-medical queries.
- riskLevel: (string) "low", "medium", or "high" based on severity (primarily for health queries). Default to "low" for general non-medical queries.
- recommendations: (array of strings) Specific actions the user should consider (medical or general). Can be an empty array if not applicable.
- preventiveAdvice: (array of strings) Preventive measures relevant to the query (medical or general). Can be an empty array if not applicable.
- followUpQuestions: (array of strings) Suggested follow-up questions the user might want to ask. Can be an empty array if not applicable.
`
  };

  // Format health profile if available
  let healthContext = "";
  if (data.profile) {
    healthContext += "\nHEALTH PROFILE:\n";
    healthContext += formatHealthProfileForContext(data.profile);
  }
  
  // Format health metrics if available
  if (data.metrics) {
    healthContext += "\nHEALTH METRICS:\n";
    healthContext += formatHealthMetricsForContext(data.metrics);
  }
  
  // Format symptoms if available
  if (data.symptoms && data.symptoms.length > 0) {
    healthContext += "\nRECENT SYMPTOMS:\n";
    healthContext += formatSymptomsForContext(data.symptoms);
  }
  
  // Format medical reports if available
  if (data.medicalReports && data.medicalReports.length > 0) {
    healthContext += "\nMEDICAL REPORTS:\n";
    healthContext += formatMedicalReportsForContext(data.medicalReports);
  }

  // Construct the full user query with health context
  const userMessage = {
    role: "user",
    content: `${data.query}${healthContext ? "\n\nFor reference, my health information is:" + healthContext : ""}`
  };

  // Combine system message, previous conversation context, and current query
  return [systemMessage, ...previousMessages, userMessage];
}

function formatHealthProfileForContext(profile: HealthProfile): string {
  return `- Age: ${profile.age}
- Height: ${profile.height} cm
- Weight: ${profile.weight} kg
- Medical Conditions: ${profile.conditions.length > 0 ? profile.conditions.join(', ') : 'None reported'}
- Medications: ${profile.medications.length > 0 ? profile.medications.map(m => `${m.name} (${m.dosage})`).join(', ') : 'None reported'}
- Allergies: ${profile.allergies.length > 0 ? profile.allergies.join(', ') : 'None reported'}
- Family History: ${profile.familyHistory.length > 0 ? profile.familyHistory.join(', ') : 'None reported'}
- Heart Condition: ${profile.hasHeartCondition ? 'Yes' : 'No'}
- Previous Heart Attack: ${profile.hadHeartAttack ? 'Yes' : 'No'}
- Lifestyle:
  * Exercise: ${profile.lifestyle.exerciseFrequency} times per week
  * Diet: ${profile.lifestyle.diet}
  * Stress Level: ${profile.lifestyle.stressLevel}/10
  * Smoking: ${profile.lifestyle.smoker ? 'Yes' : 'No'}
  * Alcohol: ${profile.lifestyle.alcoholConsumption}`;
}

function formatHealthMetricsForContext(metrics: HealthMetrics): string {
  let lastUpdatedString = 'N/A';
  if (metrics.lastUpdated) {
    if (metrics.lastUpdated instanceof Date) {
      lastUpdatedString = metrics.lastUpdated.toLocaleDateString();
    } else if (typeof metrics.lastUpdated === 'string' || typeof metrics.lastUpdated === 'number') {
      // Attempt to parse it if it's a string or number
      const dateObj = new Date(metrics.lastUpdated);
      // Check if the date is valid
      if (!isNaN(dateObj.getTime())) {
        lastUpdatedString = dateObj.toLocaleDateString();
      } else {
        lastUpdatedString = 'Invalid Date';
      }
    } else {
      lastUpdatedString = 'Unknown Date Format';
    }
  }

  return `- Heart Rate: ${metrics.heartRate || 'N/A'} BPM
- Blood Pressure: ${metrics.bloodPressureSystolic || 'N/A'}/${metrics.bloodPressureDiastolic || 'N/A'}
- Cholesterol: ${metrics.cholesterol || 'N/A'} mg/dL
- Weight: ${metrics.weight || 'N/A'} kg
- Last Updated: ${lastUpdatedString}`;
}

function formatSymptomsForContext(symptoms: Symptom[]): string {
  return symptoms.slice(0, 5).map(s => 
    `- ${s.type} (Severity: ${s.severity}/10)
   * Duration: ${s.duration} minutes
   * Description: ${s.description}
   * Accompanied by: ${s.accompaniedBy.join(', ')}
   * Reported: ${new Date(s.timestamp).toLocaleDateString()}`
  ).join('\n');
}

function formatMedicalReportsForContext(reports: MedicalReport[]): string {
  return reports.slice(0, 3).map(r => 
    `- ${r.type} (${new Date(r.date).toLocaleDateString()}) from ${r.facility}
   * Doctor: ${r.doctor}
   * Key Findings: ${r.findings.substring(0, 150)}${r.findings.length > 150 ? '...' : ''}
   * Recommendations: ${r.recommendations.substring(0, 150)}${r.recommendations.length > 150 ? '...' : ''}`
  ).join('\n');
}

/**
 * Wrapper function to test Gemini API connectivity
 * This can be used to test different model combinations
 */
export async function testGeminiApiConnection(
  modelId: string = 'gemini-1.5-flash', 
  apiVersion: string = 'v1beta'
): Promise<any> {
  const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent`;
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyD2XIQTo6DQ08XMLm1wjwU91iaKg-7JCuE";
  
  console.log(`Testing Gemini API with endpoint: ${endpoint}`);
  
  // Simple test prompt
  const prompt = {
    contents: [
      {
        parts: [
          {
            text: "Hello, please respond with a simple greeting."
          }
        ],
        role: "user"
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256
    }
  };
  
  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prompt)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null) || await response.text();
      throw new Error(`API request failed: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      message: 'API connection successful',
      endpoint,
      modelId,
      apiVersion,
      response: data
    };
  } catch (error) {
    console.error(`Error testing API with ${modelId} via ${apiVersion}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      endpoint,
      modelId,
      apiVersion
    };
  }
}

// Helper functions for specific health information responses
function getCancerInformationResponse(): HealthAssistantResponse {
  return {
    answer: "Cancer is a disease characterized by abnormal cell growth. There are many types of cancer, each with different risk factors, symptoms, and treatments. Early detection is critical for successful treatment.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Schedule regular cancer screenings appropriate for your age and risk factors",
      "Maintain a healthy lifestyle to reduce risk factors",
      "Learn to recognize warning signs that might indicate cancer"
    ],
    preventiveAdvice: [
      "Avoid tobacco use and excessive alcohol consumption",
      "Maintain a healthy weight through diet and exercise",
      "Protect your skin from excessive sun exposure",
      "Know your family history and discuss it with your doctor"
    ],
    followUpQuestions: [
      "What cancer screenings are recommended for someone my age?",
      "How does family history affect my cancer risk?",
      "What lifestyle changes can help reduce cancer risk?",
      "What are the warning signs I should watch for?"
    ]
  };
}

function getDiabetesInformationResponse(metrics: HealthMetrics | null): HealthAssistantResponse {
  return {
    answer: "Diabetes is a chronic condition that affects how your body processes blood sugar (glucose). There are several types, with Type 2 being the most common and often related to lifestyle factors.",
    isEmergency: false,
    riskLevel: metrics && metrics.cholesterol > 200 ? "medium" : "low",
    recommendations: [
      "Monitor blood glucose levels regularly if at risk",
      "Maintain a balanced diet low in refined sugars",
      "Exercise regularly to improve insulin sensitivity",
      "Maintain a healthy weight"
    ],
    preventiveAdvice: [
      "Choose complex carbohydrates over simple sugars",
      "Aim for at least 150 minutes of moderate exercise weekly",
      "Maintain a healthy weight through diet and exercise",
      "Limit alcohol consumption"
    ],
    followUpQuestions: [
      "What are the early warning signs of diabetes?",
      "How does diet affect blood sugar levels?",
      "What tests are used to diagnose diabetes?",
      "How can I prevent or delay type 2 diabetes onset?"
    ]
  };
}

function getBloodPressureInformationResponse(metrics: HealthMetrics | null): HealthAssistantResponse {
  const hasHighBP = metrics && (metrics.bloodPressureSystolic > 140 || metrics.bloodPressureDiastolic > 90);
  const isEmergencyBP = metrics && (metrics.bloodPressureSystolic > 180 || metrics.bloodPressureDiastolic > 120);
  
  return {
    answer: "Blood pressure is the force of blood pushing against the walls of your arteries. High blood pressure (hypertension) increases your risk of serious health problems like heart disease and stroke.",
    isEmergency: isEmergencyBP ? true : false,
    riskLevel: hasHighBP ? "medium" : "low",
    recommendations: [
      "Monitor your blood pressure regularly",
      "Limit sodium intake to less than 2,300mg daily",
      "Engage in regular physical activity",
      "Manage stress through relaxation techniques"
    ],
    preventiveAdvice: [
      "Follow the DASH diet (rich in fruits, vegetables, and low-fat dairy)",
      "Limit alcohol consumption",
      "Maintain a healthy weight",
      "Quit smoking if applicable"
    ],
    followUpQuestions: [
      "What's considered a healthy blood pressure range?",
      "How often should I check my blood pressure?",
      "What foods should I avoid for healthy blood pressure?",
      "When should I consider medication for blood pressure?"
    ]
  };
}

function getHeartDiseaseInformationResponse(profile: HealthProfile | null, metrics: HealthMetrics | null): HealthAssistantResponse {
  return {
    answer: "Heart disease refers to several conditions that affect heart function, with coronary artery disease being the most common. Risk factors include high blood pressure, high cholesterol, smoking, diabetes, obesity, and family history.",
    isEmergency: false,
    riskLevel: profile?.hasHeartCondition || profile?.hadHeartAttack ? "high" : "medium",
    recommendations: [
      "Schedule regular check-ups to monitor heart health",
      "Follow a heart-healthy diet low in saturated fats",
      "Engage in regular aerobic exercise",
      "Take prescribed medications as directed"
    ],
    preventiveAdvice: [
      "Maintain a healthy blood pressure and cholesterol level",
      "Avoid tobacco products and limit alcohol consumption",
      "Manage stress through relaxation techniques",
      "Maintain a healthy weight"
    ],
    followUpQuestions: [
      "What are the warning signs of a heart attack?",
      "How does exercise benefit heart health?",
      "What dietary changes promote heart health?",
      "What tests can assess my heart health?"
    ]
  };
}

function getCholesterolInformationResponse(metrics: HealthMetrics | null): HealthAssistantResponse {
  return {
    answer: "Cholesterol is a waxy substance found in your blood. While your body needs cholesterol to build healthy cells, high cholesterol levels can increase your risk of heart disease.",
    isEmergency: false,
    riskLevel: metrics && metrics.cholesterol > 240 ? "medium" : "low",
    recommendations: [
      "Get your cholesterol levels checked regularly",
      "Eat a diet low in saturated and trans fats",
      "Exercise regularly to raise HDL (good) cholesterol",
      "Consider medication if lifestyle changes aren't enough"
    ],
    preventiveAdvice: [
      "Eat foods rich in omega-3 fatty acids and soluble fiber",
      "Limit intake of red meat and full-fat dairy products",
      "Maintain a healthy weight",
      "Avoid smoking and excessive alcohol consumption"
    ],
    followUpQuestions: [
      "What's the difference between HDL and LDL cholesterol?",
      "How often should I get my cholesterol checked?",
      "What foods can help lower cholesterol?",
      "At what level should I be concerned about my cholesterol?"
    ]
  };
}

function getExerciseInformationResponse(profile: HealthProfile | null): HealthAssistantResponse {
  return {
    answer: "Regular physical activity is one of the most important things you can do for your health. It can help control weight, reduce risk of heart disease, strengthen bones and muscles, and improve mental health and mood.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Aim for at least 150 minutes of moderate aerobic activity weekly",
      "Include strength training exercises at least twice weekly",
      "Start slowly and gradually increase intensity if you're new to exercise",
      "Choose activities you enjoy to maintain motivation"
    ],
    preventiveAdvice: [
      "Warm up before and cool down after exercise",
      "Stay hydrated before, during, and after physical activity",
      "Use proper form and equipment to prevent injuries",
      "Listen to your body and rest when needed"
    ],
    followUpQuestions: [
      "What type of exercise is best for my health goals?",
      "How can I fit exercise into my busy schedule?",
      "What exercises are safe if I have joint problems?",
      "How long before I see results from exercise?"
    ]
  };
}

function getDietInformationResponse(profile: HealthProfile | null): HealthAssistantResponse {
  return {
    answer: "A healthy diet is essential for overall health and can help prevent many chronic diseases. Focus on balanced nutrition with a variety of fruits, vegetables, whole grains, lean proteins, and healthy fats.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Fill half your plate with fruits and vegetables",
      "Choose whole grains over refined grains",
      "Include a variety of protein sources",
      "Limit added sugars, sodium, and unhealthy fats"
    ],
    preventiveAdvice: [
      "Practice mindful eating to avoid overeating",
      "Prepare more meals at home to control ingredients",
      "Stay hydrated by drinking water throughout the day",
      "Read nutrition labels when shopping for food"
    ],
    followUpQuestions: [
      "What dietary approach is best for my health goals?",
      "How can I reduce sugar in my diet?",
      "What are good sources of plant-based protein?",
      "How can I make healthy eating more affordable?"
    ]
  };
}

function getMedicationInformationResponse(profile: HealthProfile | null): HealthAssistantResponse {
  return {
    answer: "Medications can be essential tools in managing and treating health conditions. Understanding how to use them properly and being aware of potential side effects is important for medication safety.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Always take medications as prescribed by your healthcare provider",
      "Keep an updated list of all medications you take",
      "Inform all healthcare providers about all medications you're taking",
      "Store medications according to instructions"
    ],
    preventiveAdvice: [
      "Ask about potential side effects when starting new medications",
      "Don't stop taking prescribed medications without consulting your doctor",
      "Use the same pharmacy for all prescriptions when possible",
      "Dispose of unused medications properly"
    ],
    followUpQuestions: [
      "What should I do if I miss a dose of my medication?",
      "How can I manage potential side effects?",
      "Are there any foods or other medications I should avoid?",
      "Are there generic alternatives to my prescription?"
    ]
  };
}

function getGenericHealthInformationResponse(topic: string): HealthAssistantResponse {
  return {
    answer: `${topic.charAt(0).toUpperCase() + topic.slice(1)} is an important health topic to understand. For personalized information about this topic, consider consulting with a healthcare professional who can provide guidance specific to your health situation.`,
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Consult with a healthcare provider for personalized advice",
      "Research this topic from reputable medical sources",
      "Consider how this topic relates to your overall health plan",
      "Track any relevant symptoms or concerns"
    ],
    preventiveAdvice: [
      "Maintain regular health check-ups",
      "Follow a balanced diet and regular exercise routine",
      "Get adequate sleep and manage stress",
      "Avoid tobacco and limit alcohol consumption"
    ],
    followUpQuestions: [
      `How does ${topic} relate to my current health status?`,
      `What lifestyle changes might help with ${topic}?`,
      `Are there specific risk factors I should know about ${topic}?`,
      `What are the latest medical advances regarding ${topic}?`
    ]
  };
}

function getSymptomBasedResponse(query: string, symptoms: Symptom[], profile: HealthProfile | null | undefined): HealthAssistantResponse {
  return {
    answer: "Based on the symptoms you've described, I can provide some general information. Remember that proper medical diagnosis requires an evaluation by a healthcare professional.",
    isEmergency: query.includes('severe') || query.includes('extreme pain') || query.includes('chest pain'),
    riskLevel: query.includes('severe') ? "high" : query.includes('moderate') ? "medium" : "low",
    recommendations: [
      "Keep track of your symptoms, including timing, duration, and triggers",
      "Consider consulting a healthcare provider for proper evaluation",
      "Rest and stay hydrated while recovering",
      "Follow any treatment plans you've previously been given for similar symptoms"
    ],
    preventiveAdvice: [
      "Maintain a healthy lifestyle with proper nutrition and exercise",
      "Ensure adequate sleep and stress management",
      "Avoid known triggers for your symptoms",
      "Stay up to date with recommended vaccinations and health screenings"
    ],
    followUpQuestions: [
      "How long have you been experiencing these symptoms?",
      "Have you noticed any patterns or triggers for your symptoms?",
      "Have you tried any treatments or remedies?",
      "Have you experienced similar symptoms in the past?"
    ]
  };
}

function getExerciseAdviceResponse(profile: HealthProfile | null | undefined, metrics: HealthMetrics | null): HealthAssistantResponse {
  return {
    answer: "Regular physical activity is crucial for maintaining good health. The right exercise program depends on your current fitness level, health conditions, and personal goals.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Aim for at least 150 minutes of moderate aerobic activity weekly",
      "Include strength training exercises at least twice weekly",
      "Start with low-intensity activities if you're new to exercise",
      "Consider activities you enjoy to maintain motivation"
    ],
    preventiveAdvice: [
      "Always warm up before and cool down after exercise",
      "Stay hydrated during physical activity",
      "Use proper form and equipment to prevent injuries",
      "Increase intensity and duration gradually"
    ],
    followUpQuestions: [
      "What are your fitness goals?",
      "Do you have any physical limitations or health concerns?",
      "What types of exercise do you enjoy?",
      "How can you fit regular exercise into your schedule?"
    ]
  };
}

function getDietaryAdviceResponse(profile: HealthProfile | null | undefined, metrics: HealthMetrics | null): HealthAssistantResponse {
  return {
    answer: "A balanced diet plays a vital role in maintaining good health and preventing chronic diseases. Nutritional needs vary based on age, gender, activity level, and health conditions.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Eat a variety of fruits and vegetables daily",
      "Choose whole grains over refined grains",
      "Include lean proteins and healthy fats",
      "Limit added sugars, sodium, and processed foods"
    ],
    preventiveAdvice: [
      "Practice portion control to maintain a healthy weight",
      "Stay hydrated by drinking water throughout the day",
      "Plan meals ahead to make healthier choices",
      "Read nutrition labels when shopping"
    ],
    followUpQuestions: [
      "Are you following any specific dietary pattern?",
      "Do you have any food allergies or intolerances?",
      "Are there specific foods you struggle to include or avoid?",
      "How can you make healthy eating more practical for your lifestyle?"
    ]
  };
}

function getSleepAdviceResponse(profile: HealthProfile | null | undefined): HealthAssistantResponse {
  return {
    answer: "Quality sleep is essential for physical health, mental well-being, and cognitive function. Most adults need 7-9 hours of sleep per night for optimal health.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Maintain a consistent sleep schedule, even on weekends",
      "Create a restful environment that's cool, quiet, and dark",
      "Limit exposure to screens before bedtime",
      "Avoid caffeine, large meals, and alcohol close to bedtime"
    ],
    preventiveAdvice: [
      "Establish a relaxing bedtime routine",
      "Exercise regularly, but not too close to bedtime",
      "Manage stress through relaxation techniques",
      "Limit daytime naps to 20-30 minutes"
    ],
    followUpQuestions: [
      "How many hours of sleep do you typically get?",
      "Do you have trouble falling asleep or staying asleep?",
      "What's your bedtime routine like?",
      "How does your sleep environment affect your rest?"
    ]
  };
}

function getMentalHealthResponse(profile: HealthProfile | null | undefined): HealthAssistantResponse {
  return {
    answer: "Mental health is an essential component of overall well-being. Taking care of your mental health includes managing stress, understanding your emotions, and seeking support when needed.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Practice stress management techniques like meditation or deep breathing",
      "Maintain social connections and supportive relationships",
      "Seek professional help if experiencing persistent mental health concerns",
      "Prioritize self-care activities that you enjoy"
    ],
    preventiveAdvice: [
      "Establish healthy boundaries in work and personal life",
      "Get regular physical activity, which can improve mood",
      "Ensure adequate sleep and proper nutrition",
      "Limit alcohol and avoid recreational drugs"
    ],
    followUpQuestions: [
      "What stress management techniques work best for you?",
      "How do you practice self-care in your daily routine?",
      "Are there specific mental health concerns you're experiencing?",
      "What support systems do you have in place?"
    ]
  };
}

function getMedicationResponse(profile: HealthProfile | null | undefined): HealthAssistantResponse {
  return {
    answer: "Medications can be important tools for managing health conditions. Using them safely and effectively requires understanding their purpose, proper dosing, potential side effects, and interactions.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Take medications exactly as prescribed",
      "Keep a current list of all medications you take",
      "Use one pharmacy for all prescriptions when possible",
      "Discuss any concerns about your medications with your healthcare provider"
    ],
    preventiveAdvice: [
      "Store medications properly according to instructions",
      "Check expiration dates regularly",
      "Don't stop taking prescribed medications without consulting your doctor",
      "Dispose of unused medications properly"
    ],
    followUpQuestions: [
      "Are you experiencing any side effects from your medications?",
      "Do you have questions about how to take your medications?",
      "Are you taking any over-the-counter medications or supplements?",
      "How do you remember to take your medications as prescribed?"
    ]
  };
}

function getRiskAssessmentResponse(profile: HealthProfile | null | undefined, metrics: HealthMetrics | null): HealthAssistantResponse {
  return {
    answer: "Understanding your health risks can help you take preventive measures and make informed decisions about your health. Risk factors can be genetic, environmental, or lifestyle-related.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Schedule regular check-ups and recommended screenings",
      "Discuss your family health history with your healthcare provider",
      "Address modifiable risk factors through lifestyle changes",
      "Stay informed about health conditions you may be at risk for"
    ],
    preventiveAdvice: [
      "Maintain a healthy weight through diet and exercise",
      "Avoid tobacco and limit alcohol consumption",
      "Manage stress through healthy coping mechanisms",
      "Follow safety precautions to prevent accidents and injuries"
    ],
    followUpQuestions: [
      "Are you aware of any specific health conditions in your family history?",
      "When was your last comprehensive health check-up?",
      "Are there specific health risks you're concerned about?",
      "What preventive measures are you currently taking?"
    ]
  };
}

function getMedicalReportResponse(reports: MedicalReport[]): HealthAssistantResponse {
  return {
    answer: "Medical reports and test results provide valuable information about your health status. Understanding these reports can help you and your healthcare provider make informed decisions about your care.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Keep copies of all your medical reports for your records",
      "Discuss any abnormal results with your healthcare provider",
      "Follow up with recommended additional testing if applicable",
      "Schedule follow-up appointments as advised"
    ],
    preventiveAdvice: [
      "Attend all recommended screening tests for your age and risk factors",
      "Prepare questions about your reports before medical appointments",
      "Follow lifestyle recommendations based on your test results",
      "Stay consistent with monitoring if you have chronic conditions"
    ],
    followUpQuestions: [
      "Do you have questions about any specific test results?",
      "Has your doctor explained what your test results mean for your health?",
      "Are there any follow-up tests recommended?",
      "How frequently should you have these tests repeated?"
    ]
  };
}

function getGeneralHealthResponse(profile: HealthProfile | null | undefined, metrics: HealthMetrics | null, query: string): HealthAssistantResponse {
  return {
    answer: "Overall health involves many interconnected factors, including physical activity, nutrition, sleep, stress management, and preventive care. A balanced approach to these factors contributes to well-being and disease prevention.",
    isEmergency: false,
    riskLevel: "low",
    recommendations: [
      "Maintain regular check-ups with healthcare providers",
      "Follow a balanced diet rich in fruits, vegetables, and whole grains",
      "Aim for at least 150 minutes of moderate exercise weekly",
      "Prioritize quality sleep and stress management"
    ],
    preventiveAdvice: [
      "Stay up to date with recommended vaccinations",
      "Practice good hygiene habits",
      "Maintain a healthy weight",
      "Avoid tobacco and limit alcohol consumption"
    ],
    followUpQuestions: [
      "What aspect of your health would you like to focus on improving?",
      "Are there specific health goals you're working toward?",
      "What preventive health measures are you currently following?",
      "How balanced do you feel your approach to health is currently?"
    ]
  };
} 