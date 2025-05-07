import { getSupabaseClient } from './supabase';

interface Report {
  id: number;
  name: string;
  date: string;
}

interface ShareResult {
  shareUrl: string;
  expiresAt: Date;
}

/**
 * Creates a shareable link for selected medical reports
 * 
 * @param reports Array of report objects to share
 * @returns Object containing the share URL and expiration time
 */
export async function createShareableLink(reports: Report[]): Promise<ShareResult> {
  // In a real implementation, this would:
  // 1. Create a record in the database with the reports to share
  // 2. Generate a unique token for access
  // 3. Set an expiration time
  
  // For demo purposes, create a mock URL with report IDs
  const reportIds = reports.map(report => report.id).join(',');
  const shareToken = `share_${Math.random().toString(36).substring(2, 10)}`;
  
  // Generate the shareable URL
  const shareUrl = `${window.location.origin}/reports/share-id/${shareToken}`;
  
  // Mock expiration time (24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  // In a production app, you'd save this to the database
  try {
    const supabase = getSupabaseClient();
    
    // You would uncomment and implement this in a real application
    /*
    const { data, error } = await supabase
      .from('shared_reports')
      .insert({
        token: shareToken,
        report_ids: reportIds,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });
      
    if (error) throw error;
    */
    
    // Log for debugging
    console.log('Created shareable link', { shareUrl, expiresAt, reportIds });
    
    return {
      shareUrl,
      expiresAt
    };
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw new Error('Failed to create shareable link');
  }
} 