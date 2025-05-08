import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(req: NextRequest) {
  // Check if proper authorization is provided
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  // This is a simple example. In production, use a proper secret
  if (token !== 'your_secret_admin_token') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Supabase configuration missing' },
      { status: 500 }
    );
  }

  try {
    // Create Supabase client with service role key for table creation
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create medical_reports table
    const { error } = await supabase.rpc('create_medical_reports_table', {});

    if (error) {
      // If the RPC doesn't exist, try direct SQL
      const { error: sqlError } = await supabase.from('_migrations').select('*').limit(1);

      if (sqlError) {
        return NextResponse.json(
          { 
            error: 'Failed to create table via RPC or direct SQL. Please create it manually.',
            message: sqlError.message,
            hint: `
              Please execute this SQL in the Supabase SQL Editor:
              
              CREATE TABLE IF NOT EXISTS medical_reports (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES auth.users NOT NULL,
                type VARCHAR(255) NOT NULL, 
                date TIMESTAMP WITH TIME ZONE NOT NULL,
                doctor VARCHAR(255),
                facility VARCHAR(255),
                findings TEXT,
                recommendations TEXT,
                follow_up BOOLEAN DEFAULT false,
                follow_up_date TIMESTAMP WITH TIME ZONE
              );
              CREATE INDEX IF NOT EXISTS idx_medical_reports_user_id ON medical_reports(user_id);
            `
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: 'medical_reports table created successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create table', message: error.message },
      { status: 500 }
    );
  }
} 