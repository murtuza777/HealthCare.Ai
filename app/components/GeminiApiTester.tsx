'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Available Gemini models to test
const GEMINI_MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 2.0 Flash (Recommended)' },
  { id: 'gemini-pro', name: 'Gemini Pro (Legacy)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' }
];

interface TestResult {
  success?: boolean;
  message?: string;
  apiResponse?: string;
  error?: string;
  model?: string;
  endpoint?: string;
}

// Define type for direct API response
interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface ErrorDetails {
  '@type'?: string;
  violations?: Array<{
    quotaId: string;
    quotaMetric?: string;
    quotaDimensions?: Record<string, string>;
  }>;
  retryDelay?: string;
}

interface ErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: ErrorDetails[];
  };
}

export default function GeminiApiTester() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showTester, setShowTester] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [apiVersion, setApiVersion] = useState('v1beta');
  const [rateLimitInfo, setRateLimitInfo] = useState<string | null>(null);

  const constructEndpoint = (model: string, version: string) => {
    return `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`;
  };

  const testGeminiApi = async () => {
    setLoading(true);
    setResult(null);
    setRateLimitInfo(null);
    
    const endpoint = constructEndpoint(selectedModel, apiVersion);
    
    try {
      // First do a direct API call to verify the endpoint works
      const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyD2XIQTo6DQ08XMLm1wjwU91iaKg-7JCuE";
      
      console.log(`Testing direct API call to ${endpoint}`);
      
      // Use a simpler prompt to reduce token usage
      const prompt = {
        contents: [
          {
            parts: [
              { text: "Hello, please respond with a brief greeting." }
            ],
            role: "user"
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256
        }
      };

      // Test the direct API call
      const directResponse = await fetch(`${endpoint}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prompt)
      });

      if (!directResponse.ok) {
        let errorText;
        try {
          const errorData = await directResponse.json() as ErrorResponse;
          errorText = JSON.stringify(errorData);
          
          // Check for rate limit errors
          if (directResponse.status === 429) {
            const retryAfter = directResponse.headers.get('retry-after') || 
                            errorData?.error?.details?.find((d) => d['@type']?.includes('RetryInfo'))?.retryDelay || 
                            '60s';
            
            setRateLimitInfo(`Rate limit exceeded. API suggests waiting ${retryAfter} before trying again. Consider switching to a different model with higher quotas.`);
            
            // Extract the specific quota that was exceeded
            const quotaInfo = errorData?.error?.details?.find((d) => d['@type']?.includes('QuotaFailure'))?.violations || [];
            if (quotaInfo.length > 0) {
              setRateLimitInfo(prev => `${prev}\n\nSpecific quotas exceeded: ${quotaInfo.map((v) => v.quotaId).join(', ')}`);
            }
          }
          
          // Check for model not found errors
          if (directResponse.status === 404 && 
              errorData?.error?.message?.includes('not found for API version') &&
              selectedModel !== 'gemini-1.5-flash') {
            setRateLimitInfo(`The model "${selectedModel}" is not available in the selected API version. Please switch to "Gemini 2.0 Flash" model which is confirmed to work with the v1beta API.`);
          }
        } catch (e) {
          errorText = await directResponse.text();
        }
        
        setResult({
          success: false,
          error: `Direct API call failed: ${directResponse.status}`,
          message: errorText,
          model: selectedModel,
          endpoint: endpoint
        });
        setLoading(false);
        return;
      }

      const directData = await directResponse.json() as GeminiApiResponse;
      const directContent = directData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text';

      // Now test our backend endpoint that should use the same API
      const response = await fetch('/api/test-connection/test-gemini-api');
      const data = await response.json() as {
        success?: boolean;
        message?: string;
        apiResponse?: string;
        error?: string;
      };
      
      // Combine the test results
      setResult({
        success: directResponse.ok && (data.success === true),
        message: data.message || "Direct API call successful, but backend wrapper failed",
        apiResponse: directContent,
        error: data.error,
        model: selectedModel,
        endpoint: endpoint
      });
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to complete API test',
        message: error instanceof Error ? error.message : 'Unknown error',
        model: selectedModel,
        endpoint: endpoint
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <button 
        onClick={() => setShowTester(!showTester)}
        className="text-xs text-gray-500 hover:text-red-500 mb-2 flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 mr-1 transition-transform ${showTester ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {showTester ? 'Hide API Tester' : 'Test Gemini Connection'}
      </button>
      
      {showTester && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs"
        >
          <h3 className="text-sm font-medium text-white mb-3">Gemini API Connection Tester</h3>
          
          <div className="flex flex-col space-y-2 mb-3">
            <div className="flex items-center space-x-3">
              <label className="text-gray-400 w-24">Model:</label>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-gray-800 text-white px-2 py-1 rounded text-xs border border-gray-700"
              >
                {GEMINI_MODELS.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <label className="text-gray-400 w-24">API Version:</label>
              <select 
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value)}
                className="bg-gray-800 text-white px-2 py-1 rounded text-xs border border-gray-700"
              >
                <option value="v1beta">v1beta (Recommended)</option>
                <option value="v1">v1</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={testGeminiApi}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white px-3 py-1 rounded-md text-xs mb-3"
          >
            {loading ? 'Testing...' : 'Test Gemini API Connection'}
          </button>
          
          {rateLimitInfo && (
            <div className="mt-3 p-3 rounded-md text-xs bg-yellow-900/30 border border-yellow-800 text-yellow-200">
              <div className="font-medium mb-1">⚠️ API Information</div>
              <div className="whitespace-pre-line">{rateLimitInfo}</div>
              <div className="mt-2 text-yellow-300 font-medium">Recommendation: Select the 'Gemini 2.0 Flash (Recommended)' model from the dropdown above.</div>
            </div>
          )}
          
          {result && (
            <div className={`mt-3 p-3 rounded-md text-xs ${result.success ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'}`}>
              <div className="font-medium mb-1">{result.success ? '✓ Success' : '✗ Error'}</div>
              
              {result.message && (
                <div className="mb-2">{result.message}</div>
              )}

              {result.endpoint && (
                <div className="mb-1">
                  <span className="text-gray-400">Endpoint tested: </span>
                  <span className="font-mono text-xs break-all">{result.endpoint}</span>
                </div>
              )}
              
              {result.error && (
                <div className="text-red-400 mb-2">{result.error}</div>
              )}
              
              {result.apiResponse && (
                <div>
                  <div className="font-medium mt-2 mb-1">API Response:</div>
                  <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto text-xs">
                    {result.apiResponse}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-3 text-gray-400">
            <p>This tool tests direct connectivity to the Gemini API to troubleshoot issues.</p>
            <p className="mt-1">If testing fails due to rate limits, try switching to 'gemini-pro' model which has higher free-tier quotas.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
} 