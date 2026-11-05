import { NextRequest, NextResponse } from 'next/server';
import { getHealthAssistantResponse } from '@/app/utils/healthAssistant';
import { Message, HealthProfile, HealthMetrics, Symptom, MedicalReport } from '@/app/utils/types';

// Define the expected request body structure
interface HealthAssistantRequestBody {
  query: string;
  profile?: HealthProfile | null;
  metrics?: HealthMetrics | null;
  symptoms?: Symptom[] | null;
  medicalReports?: MedicalReport[] | null;
  messageHistory?: Message[] | null;
}

export async function POST(req: NextRequest) {
  console.log("AI API route called");
  
  try {
    // Parse the request body
    const requestBody = await req.json() as HealthAssistantRequestBody;
    
    console.log("AI API route received query:", requestBody.query);
    console.log("Request includes profile:", !!requestBody.profile);
    console.log("Request includes metrics:", !!requestBody.metrics);
    console.log("Request includes symptoms:", !!requestBody.symptoms && Array.isArray(requestBody.symptoms));
    console.log("Request includes medical reports:", !!requestBody.medicalReports && Array.isArray(requestBody.medicalReports));
    console.log("Request includes message history:", !!requestBody.messageHistory && Array.isArray(requestBody.messageHistory));
    
    if (!requestBody.query || typeof requestBody.query !== 'string') {
      console.error("Invalid request: missing or invalid query");
      return NextResponse.json(
        { error: 'Invalid request: query is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Call the health assistant function with the request data
    console.log("Calling getHealthAssistantResponse function");
    
    const response = await getHealthAssistantResponse({
      query: requestBody.query,
      profile: requestBody.profile || null,
      metrics: requestBody.metrics || null,
      symptoms: requestBody.symptoms || null,
      medicalReports: requestBody.medicalReports || null,
      messageHistory: requestBody.messageHistory || null
    });
    
    console.log("AI response generated successfully");
    console.log("Response contains:", 
      "answer length:", response.answer.length, 
      "isEmergency:", response.isEmergency,
      "riskLevel:", response.riskLevel,
      "recommendations count:", response.recommendations.length,
      "followUpQuestions count:", response.followUpQuestions.length
    );
    
    // Return the AI response
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in AI route:", error);
    
    // Check if the error is due to Gemini API rate limiting
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isRateLimitError = errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit');
    
    console.error("Full error details:", errorMessage);
    console.error("Is rate limit error:", isRateLimitError);
    
    const fallbackResponse = {
      answer: isRateLimitError 
        ? "I'm currently experiencing high demand and have reached my API usage limits. Please try again in a few moments."
        : "I'm having trouble accessing my knowledge database right now. This might be due to a temporary service disruption.",
      isEmergency: false,
      riskLevel: "low" as const,
      recommendations: [
        "Try asking your question again in a few moments",
        "Check your internet connection",
        "If the issue persists, try a simpler question"
      ],
      preventiveAdvice: [],
      followUpQuestions: [
        "Can I help with something else?",
        "Would you like general health information?",
        "Could you rephrase your question?"
      ]
    };
    
    return NextResponse.json(
      { 
        error: 'Failed to generate AI response',
        details: errorMessage,
        isRateLimit: isRateLimitError,
        fallbackResponse
      },
      { status: 500 }
    );
  }
} 