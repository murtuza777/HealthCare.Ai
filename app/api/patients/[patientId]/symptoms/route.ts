import { NextRequest, NextResponse } from 'next/server';

// Define the expected symptom data structure
interface SymptomData {
  type: string;
  severity: string;
  description: string;
  duration: string;
  accompaniedBy: string;
}

// Mock symptoms data for development
const mockSymptoms = [
  {
    id: '1',
    type: 'chest pain',
    severity: 'mild',
    recordedAt: new Date().toISOString(),
    description: 'Slight discomfort when climbing stairs',
    duration: '5-10 minutes',
    accompaniedBy: '["shortness of breath"]'
  },
  {
    id: '2',
    type: 'dizziness',
    severity: 'moderate',
    recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    description: 'Felt lightheaded after standing up quickly',
    duration: '2-3 minutes',
    accompaniedBy: '["nausea"]'
  }
];

// GET symptoms for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    // In a real app, would use the patientId to fetch from database
    const patientId = params.patientId;
    console.log(`Getting symptoms for patient ${patientId}`);
    
    // Simulate server delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return NextResponse.json(mockSymptoms);
  } catch (error) {
    console.error('Error fetching symptoms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symptoms' },
      { status: 500 }
    );
  }
}

// POST a new symptom
export async function POST(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const patientId = params.patientId;
    
    // Get the request body as any to handle safely
    const requestBody = await request.json() as Record<string, unknown>;
    
    // Type cast with default values for safety
    const symptomData: SymptomData = {
      type: typeof requestBody.type === 'string' ? requestBody.type : '',
      severity: typeof requestBody.severity === 'string' ? requestBody.severity : 'mild',
      description: typeof requestBody.description === 'string' ? requestBody.description : '',
      duration: typeof requestBody.duration === 'string' ? requestBody.duration : '',
      accompaniedBy: typeof requestBody.accompaniedBy === 'string' ? requestBody.accompaniedBy : '[]'
    };
    
    console.log(`Adding symptom for patient ${patientId}:`, symptomData);
    
    // Simulate server delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate a mock ID for the new symptom
    const newSymptom = {
      id: Date.now().toString(),
      type: symptomData.type,
      severity: symptomData.severity,
      description: symptomData.description,
      duration: symptomData.duration,
      accompaniedBy: symptomData.accompaniedBy,
      recordedAt: new Date().toISOString()
    };
    
    return NextResponse.json(newSymptom, { status: 201 });
  } catch (error) {
    console.error('Error adding symptom:', error);
    return NextResponse.json(
      { error: 'Failed to add symptom' },
      { status: 500 }
    );
  }
}

// DELETE all symptoms for a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const patientId = params.patientId;
    console.log(`Clearing all symptoms for patient ${patientId}`);
    
    // Simulate server delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing symptoms:', error);
    return NextResponse.json(
      { error: 'Failed to clear symptoms' },
      { status: 500 }
    );
  }
} 