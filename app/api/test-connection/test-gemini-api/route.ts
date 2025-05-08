import { NextRequest, NextResponse } from 'next/server';
import { testGeminiApiConnection } from '@/app/utils/healthAssistant';

// Gemini API key from the environment or hardcoded for testing
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyD2XIQTo6DQ08XMLm1wjwU91iaKg-7JCuE";
// Updated to use gemini-1.5-flash with v1beta API which has higher free-tier quota limits
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_VERSION = 'v1beta';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${GEMINI_MODEL}:generateContent`;

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

export async function GET(req: NextRequest) {
  console.log("Test Gemini API endpoint called");
  
  // Get model and version from query params if provided
  const searchParams = req.nextUrl.searchParams;
  const model = searchParams.get('model') || 'gemini-1.5-flash';
  const version = searchParams.get('version') || 'v1beta';
  
  try {
    const testResult = await testGeminiApiConnection(model, version);
    console.log("Gemini API test completed with result:", testResult.success);
    
    if (!testResult.success) {
      // Check if this is a model not found error
      if (testResult.message && testResult.message.includes('not found for API version')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Model not found',
            message: `The model "${model}" is not available in ${version}. Please try gemini-1.5-flash which is known to work with the v1beta API.`,
            model: testResult.modelId,
            version: testResult.apiVersion,
            endpoint: testResult.endpoint
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Gemini API test failed',
          message: testResult.message,
          model: testResult.modelId,
          version: testResult.apiVersion,
          endpoint: testResult.endpoint
        },
        { status: 500 }
      );
    }
    
    // Extract content from response if available
    let content = 'No content available';
    try {
      if (testResult.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        content = testResult.response.candidates[0].content.parts[0].text;
      }
    } catch (parseError) {
      console.error("Error parsing response content:", parseError);
      content = 'Error parsing content';
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Gemini API test successful',
        apiResponse: content,
        model: model,
        version: version,
        endpoint: testResult.endpoint
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in test-gemini-api route:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error testing Gemini API',
        message: error.message || 'Unknown error',
        model: model,
        version: version
      },
      { status: 500 }
    );
  }
} 