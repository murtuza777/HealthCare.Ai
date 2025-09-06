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
      // Check if this is a rate limit error
      if (testResult.message.includes('429') || testResult.message.toLowerCase().includes('quota exceeded')) {
        return NextResponse.json({
          status: 'degraded',
          gemini: {
            status: 'rate_limited',
            model: 'gemini-1.5-flash',
            message: 'Gemini API is temporarily rate limited. The application will use fallback responses.',
            retryAfter: '60' // Suggest retry after 1 minute
          },
          fallback: {
            status: 'active',
            message: 'Using local response system'
          },
          timestamp: new Date().toISOString()
        }, { 
          status: 429,
          headers: {
            'Retry-After': '60'
          }
        });
      }
      
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
    
    // Determine if this is a rate limit error
    const isRateLimit = error instanceof Error && 
      (error.message.includes('429') || 
       error.message.toLowerCase().includes('quota exceeded'));
    
    if (isRateLimit) {
      return NextResponse.json({
        status: 'degraded',
        gemini: {
          status: 'rate_limited',
          model: 'gemini-1.5-flash',
          message: 'Gemini API is temporarily rate limited. The application will use fallback responses.',
          retryAfter: '60'
        },
        fallback: {
          status: 'active',
          message: 'Using local response system'
        },
        timestamp: new Date().toISOString()
      }, { 
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      });
    }
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 