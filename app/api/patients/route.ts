import { NextResponse } from 'next/server';
import { db, generateId, formatDate, stringifyForStorage } from '../../lib/db';
import { patients, medications, healthMetrics, symptoms, patientDetails } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (patientId) {
      // Get specific patient
      const patient = await db.query.patients.findFirst({
        where: eq(patients.id, patientId),
        with: {
          medications: true,
          healthMetrics: {
            orderBy: (metrics, { desc }) => [desc(metrics.recordedAt)],
            limit: 1
          },
          symptoms: {
            orderBy: (symptoms, { desc }) => [desc(symptoms.recordedAt)],
            limit: 10
          },
          details: true
        }
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      return NextResponse.json(patient);
    }

    // Get all patients (with pagination)
    const allPatients = await db.query.patients.findMany({
      limit: 10,
      orderBy: (patients, { desc }) => [desc(patients.updatedAt)]
    });

    return NextResponse.json(allPatients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const now = formatDate(new Date());
    const patientId = generateId();

    // Start a transaction
    await db.transaction(async (tx) => {
      // Insert patient
      await tx.insert(patients).values({
        id: patientId,
        name: data.name,
        age: data.age,
        height: data.height,
        weight: data.weight,
        hasHeartCondition: data.hasHeartCondition,
        hadHeartAttack: data.hadHeartAttack,
        lastHeartAttack: data.lastHeartAttack ? formatDate(new Date(data.lastHeartAttack)) : null,
        createdAt: now,
        updatedAt: now,
      });

      // Insert medications
      if (data.medications?.length) {
        await tx.insert(medications).values(
          data.medications.map((med: any) => ({
            id: generateId(),
            patientId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            timeOfDay: stringifyForStorage(med.timeOfDay),
            startDate: formatDate(new Date(med.startDate)),
            endDate: med.endDate ? formatDate(new Date(med.endDate)) : null,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      // Insert health metrics
      await tx.insert(healthMetrics).values({
        id: generateId(),
        patientId,
        heartRate: data.healthMetrics.heartRate,
        bloodPressureSystolic: data.healthMetrics.bloodPressureSystolic,
        bloodPressureDiastolic: data.healthMetrics.bloodPressureDiastolic,
        cholesterol: data.healthMetrics.cholesterol,
        weight: data.healthMetrics.weight,
        recordedAt: now,
        createdAt: now,
      });

      // Insert patient details
      await tx.insert(patientDetails).values({
        id: generateId(),
        patientId,
        allergies: stringifyForStorage(data.allergies),
        conditions: stringifyForStorage(data.conditions),
        familyHistory: stringifyForStorage(data.familyHistory),
        smoker: data.lifestyle.smoker,
        alcoholConsumption: data.lifestyle.alcoholConsumption,
        exerciseFrequency: data.lifestyle.exerciseFrequency,
        diet: data.lifestyle.diet,
        stressLevel: data.lifestyle.stressLevel,
        createdAt: now,
        updatedAt: now,
      });
    });

    return NextResponse.json({ id: patientId }, { status: 201 });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('id');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const data = await request.json();
    const now = formatDate(new Date());

    // Start a transaction
    await db.transaction(async (tx) => {
      // Update patient
      await tx.update(patients)
        .set({
          name: data.name,
          age: data.age,
          height: data.height,
          weight: data.weight,
          hasHeartCondition: data.hasHeartCondition,
          hadHeartAttack: data.hadHeartAttack,
          lastHeartAttack: data.lastHeartAttack ? formatDate(new Date(data.lastHeartAttack)) : null,
          updatedAt: now,
        })
        .where(eq(patients.id, patientId));

      // Update medications
      if (data.medications?.length) {
        // Delete existing medications
        await tx.delete(medications).where(eq(medications.patientId, patientId));
        
        // Insert new medications
        await tx.insert(medications).values(
          data.medications.map((med: any) => ({
            id: generateId(),
            patientId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            timeOfDay: stringifyForStorage(med.timeOfDay),
            startDate: formatDate(new Date(med.startDate)),
            endDate: med.endDate ? formatDate(new Date(med.endDate)) : null,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      // Insert new health metrics record
      await tx.insert(healthMetrics).values({
        id: generateId(),
        patientId,
        heartRate: data.healthMetrics.heartRate,
        bloodPressureSystolic: data.healthMetrics.bloodPressureSystolic,
        bloodPressureDiastolic: data.healthMetrics.bloodPressureDiastolic,
        cholesterol: data.healthMetrics.cholesterol,
        weight: data.healthMetrics.weight,
        recordedAt: now,
        createdAt: now,
      });

      // Update patient details
      await tx.update(patientDetails)
        .set({
          allergies: stringifyForStorage(data.allergies),
          conditions: stringifyForStorage(data.conditions),
          familyHistory: stringifyForStorage(data.familyHistory),
          smoker: data.lifestyle.smoker,
          alcoholConsumption: data.lifestyle.alcoholConsumption,
          exerciseFrequency: data.lifestyle.exerciseFrequency,
          diet: data.lifestyle.diet,
          stressLevel: data.lifestyle.stressLevel,
          updatedAt: now,
        })
        .where(eq(patientDetails.patientId, patientId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
} 