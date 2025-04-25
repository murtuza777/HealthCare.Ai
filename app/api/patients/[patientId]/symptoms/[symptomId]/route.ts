import { NextRequest, NextResponse } from 'next/server';

// DELETE a single symptom
export async function DELETE(
  request: NextRequest,
  { params }: { params: { patientId: string; symptomId: string } }
) {
  try {
    const { patientId, symptomId } = params;
    console.log(`Deleting symptom ${symptomId} for patient ${patientId}`);
    
    // Simulate server delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real app, would delete from database here
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting symptom:', error);
    return NextResponse.json(
      { error: 'Failed to delete symptom' },
      { status: 500 }
    );
  }
} 