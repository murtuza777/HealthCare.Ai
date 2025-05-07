import { NextRequest, NextResponse } from 'next/server';

// Mock data for development 
const mockPatientData = {
  id: 'current-user-id',
  name: 'John Doe',
  age: 45,
  height: 175,
  weight: 75,
  hasHeartCondition: true,
  hadHeartAttack: false,
  lastHeartAttack: null,
  medications: [
    {
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      timeOfDay: '["Morning"]',
      startDate: '2023-01-15',
    },
    {
      name: 'Aspirin',
      dosage: '81mg',
      frequency: 'Once daily',
      timeOfDay: '["Morning"]',
      startDate: '2023-01-15',
    }
  ],
  details: {
    allergies: '["Penicillin"]',
    conditions: '["Hypertension", "High Cholesterol"]',
    familyHistory: '["Heart Disease"]',
    smoker: false,
    alcoholConsumption: 'light',
    exerciseFrequency: 3,
    diet: 'Mediterranean',
    stressLevel: 5
  },
  healthMetrics: [
    {
      heartRate: 72,
      bloodPressureSystolic: 130,
      bloodPressureDiastolic: 85,
      cholesterol: 190,
      weight: 75,
      recordedAt: new Date().toISOString()
    }
  ],
  symptoms: [
    {
      type: 'chest pain',
      severity: 'mild',
      recordedAt: new Date().toISOString(),
      description: 'Slight discomfort when climbing stairs',
      duration: '5-10 minutes',
      accompaniedBy: '["shortness of breath"]'
    }
  ]
};

// GET endpoint to retrieve patient data
export async function GET(request: NextRequest) {
  try {
    // In a real app, would extract the ID from the request and fetch from database
    // const patientId = request.nextUrl.searchParams.get('id');
    
    // Simulate server delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data for development
    return NextResponse.json(mockPatientData);
  } 
  catch (error) {
    console.error('Error fetching patient data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient data' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update patient data
export async function PUT(request: NextRequest) {
  try {
    // In a real app, would validate the request, extract user ID, and update database
    const body = await request.json();
    
    // Simulate server delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For development, just log the data we would update
    console.log('Updated patient data:', body);
    
    // Return success response
    return NextResponse.json({ success: true });
  } 
  catch (error) {
    console.error('Error updating patient data:', error);
    return NextResponse.json(
      { error: 'Failed to update patient data' },
      { status: 500 }
    );
  }
      }

// Endpoint to handle symptoms
export async function DELETE(request: NextRequest) {
  try {
    // In a real app, would extract symptom ID from the request URL and delete from database
    // const patientId = request.nextUrl.searchParams.get('id');
    
    // Simulate server delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Return success response
    return NextResponse.json({ success: true });
  } 
  catch (error) {
    console.error('Error deleting symptom:', error);
    return NextResponse.json(
      { error: 'Failed to delete symptom' },
      { status: 500 }
    );
  }
} 