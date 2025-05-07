/**
 * Report Sharing Utilities
 * 
 * These utilities help manage sharing of medical reports between patients,
 * doctors, and caregivers in the Healthcare.AI application.
 */

import { getSupabaseClient } from './supabase';

export interface ShareRequest {
  id?: string;
  report_id: string;
  patient_id: string;
  recipient_email?: string;
  recipient_id?: string;
  created_at?: Date;
  expires_at?: Date;
  access_level: 'view' | 'comment' | 'edit';
  qr_code?: string;
  status: 'pending' | 'accepted' | 'revoked';
}

/**
 * Create a new report share request
 * @param reportId The ID of the report to share
 * @param patientId The ID of the patient who owns the report
 * @param recipientEmail The email of the recipient (optional)
 * @param recipientId The ID of the recipient user (optional)
 * @param accessLevel The level of access to grant
 * @param expiryDays Number of days until the share expires
 * @returns The created share request or error
 */
export async function createShareRequest(
  reportId: string,
  patientId: string,
  recipientEmail?: string, 
  recipientId?: string,
  accessLevel: 'view' | 'comment' | 'edit' = 'view',
  expiryDays: number = 7
): Promise<{ data: ShareRequest | null, error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    
    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    
    const shareRequest: ShareRequest = {
      report_id: reportId,
      patient_id: patientId,
      recipient_email: recipientEmail,
      recipient_id: recipientId,
      created_at: new Date(),
      expires_at: expiryDate,
      access_level: accessLevel,
      status: 'pending'
    };
    
    const { data, error } = await supabase
      .from('report_shares')
      .insert([shareRequest])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating share request:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in createShareRequest:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get a share request by ID
 * @param shareId The ID of the share request
 * @returns The share request or error
 */
export async function getShareRequest(shareId: string): Promise<{ data: ShareRequest | null, error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('report_shares')
      .select('*')
      .eq('id', shareId)
      .single();
      
    if (error) {
      console.error('Error fetching share request:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in getShareRequest:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Accept a share request (for recipient)
 * @param shareId The ID of the share request
 * @param userId The ID of the user accepting the request
 * @returns Success status or error
 */
export async function acceptShareRequest(
  shareId: string,
  userId: string
): Promise<{ success: boolean, error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    
    // First verify this share is for this user
    const { data: shareData, error: fetchError } = await supabase
      .from('report_shares')
      .select('*')
      .eq('id', shareId)
      .single();
      
    if (fetchError) {
      return { success: false, error: fetchError };
    }
    
    if (shareData.recipient_id && shareData.recipient_id !== userId) {
      return { 
        success: false, 
        error: new Error('This share is not intended for this user') 
      };
    }
    
    // Update the share status
    const { error } = await supabase
      .from('report_shares')
      .update({ 
        status: 'accepted',
        recipient_id: userId  // In case it was shared by email only
      })
      .eq('id', shareId);
      
    if (error) {
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in acceptShareRequest:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Revoke a share request (for patient)
 * @param shareId The ID of the share request
 * @param patientId The ID of the patient who owns the report
 * @returns Success status or error
 */
export async function revokeShareRequest(
  shareId: string,
  patientId: string
): Promise<{ success: boolean, error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    
    // First verify this share belongs to this patient
    const { data: shareData, error: fetchError } = await supabase
      .from('report_shares')
      .select('*')
      .eq('id', shareId)
      .single();
      
    if (fetchError) {
      return { success: false, error: fetchError };
    }
    
    if (shareData.patient_id !== patientId) {
      return { 
        success: false, 
        error: new Error('Only the patient who created this share can revoke it') 
      };
    }
    
    // Update the share status
    const { error } = await supabase
      .from('report_shares')
      .update({ status: 'revoked' })
      .eq('id', shareId);
      
    if (error) {
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in revokeShareRequest:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get all share requests for a patient
 * @param patientId The ID of the patient
 * @returns List of share requests or error
 */
export async function getPatientShareRequests(
  patientId: string
): Promise<{ data: ShareRequest[] | null, error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('report_shares')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
      
    if (error) {
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in getPatientShareRequests:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all shared reports for a recipient
 * @param userId The ID of the recipient user
 * @param includeEmail Whether to include shares sent to the user's email
 * @param userEmail The email of the user (required if includeEmail is true)
 * @returns List of share requests or error
 */
export async function getSharedWithMeReports(
  userId: string,
  includeEmail: boolean = false,
  userEmail?: string
): Promise<{ data: ShareRequest[] | null, error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('report_shares')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'accepted');
      
    if (includeEmail && userEmail) {
      query = supabase
        .from('report_shares')
        .select('*')
        .or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail}`)
        .eq('status', 'accepted');
    }
    
    const { data, error } = await query;
      
    if (error) {
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in getSharedWithMeReports:', error);
    return { data: null, error: error as Error };
  }
} 