import { NextResponse } from 'next/server';
import { testGeminiApiConnection } from '@/app/utils/healthAssistant';

export async function GET() {
  try {
    console.log("AI health check endpoint called");
    
    // Test if the Gemini API is accessible
    const testResult = await testGeminiApiConnection('gemini-1.5-flash', 'v1beta');
    
    if (testResult.success) {
      return NextResponse.json({
        status: 'healthy',
        gemini: {
          status: 'connected',
          model: 'gemini-1.5-flash',
          apiVersion: 'v1beta',
          message: 'Gemini API is accessible'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        status: 'degraded',
        gemini: {
          status: 'error',
          model: 'gemini-1.5-flash',
          message: testResult.message
        },
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in AI health check:", error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 