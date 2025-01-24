/// <reference types="@cloudflare/workers-types" />

interface Env {
  HEARTCARE_KV: KVNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    try {
      // API routes
      if (url.pathname.startsWith('/api/')) {
        const path = url.pathname.replace('/api/', '');

        // Health check endpoint
        if (path === 'health') {
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }

        // Protected routes - require authentication
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }

        // Example protected endpoint
        if (path === 'patient/data') {
          // Here you would typically validate the JWT token and fetch data from Supabase
          const mockData = {
            heartRate: 72,
            bloodPressure: '120/80',
            ecgStatus: 'Normal',
            lastChecked: new Date().toISOString(),
          };

          return new Response(JSON.stringify(mockData), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }

      // If no API route matches, let the static site handle it
      return env.ASSETS.fetch(request);
      
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};
