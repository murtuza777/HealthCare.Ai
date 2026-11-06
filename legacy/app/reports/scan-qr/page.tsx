'use client';

import { useState } from 'react';
import { Scan, AlertCircle, FileText } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import dynamic from 'next/dynamic';

// Dynamically import the QRScanner to avoid SSR issues
const QRScanner = dynamic(() => import('@/app/components/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64 bg-gray-100 rounded-lg border border-gray-200">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
    </div>
  ),
});

type ScannedData = {
  type: string;
  content: {
    shareToken?: string;
    url?: string;
    reports?: any[];
    raw: string;
    formatted: string;
  };
  metadata: {
    detectedFormat: string;
    isValid: boolean;
    timestamp: string;
  };
  error?: string;
};

type SharedReport = {
  id: string;
  report_name: string;
  category: string;
  file_url: string;
  file_type: string;
  created_at: string;
};

export default function ScanQRCodePage() {
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedReports, setSharedReports] = useState<SharedReport[]>([]);
  
  const supabase = createClientComponentClient();
  
  const handleScanSuccess = async (decodedText: string, imageData: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to parse the decoded text as a URL
      let url: URL;
      try {
        url = new URL(decodedText);
      } catch (e) {
        throw new Error('Invalid QR code. Not a valid URL.');
      }
      
      // Check if it's a report sharing URL
      if (!url.pathname.includes('/reports/view-shared/')) {
        throw new Error('This QR code does not contain a valid report share link.');
      }
      
      // Extract the share token from the URL
      const shareToken = url.pathname.split('/').pop();
      if (!shareToken) {
        throw new Error('Invalid share token.');
      }
      
      // Fetch the shared report data
      const { data: shareData, error: shareError } = await supabase
        .from('shared_reports')
        .select('*')
        .eq('share_token', shareToken)
        .single();
        
      if (shareError) {
        throw new Error('Could not find the shared reports.');
      }
      
      // Check if the share has expired
      if (new Date(shareData.expires_at) < new Date()) {
        throw new Error('This shared link has expired.');
      }
      
      // Fetch the actual report metadata
      const { data: reportsData, error: reportsError } = await supabase
        .from('report_metadata')
        .select('*')
        .in('id', shareData.reports);
        
      if (reportsError) {
        throw new Error('Could not load the reports.');
      }
      
      // Get the download URLs for each report
      const reportsWithUrls = await Promise.all(
        reportsData.map(async (report) => {
          const { data: urlData } = await supabase.storage
            .from('reports')
            .createSignedUrl(report.file_path, 3600); // URL valid for 1 hour
            
          return {
            ...report,
            file_url: urlData?.signedUrl || null
          };
        })
      );
      
      setSharedReports(reportsWithUrls);
      
      // Format scanned data for display
      setScannedData({
        type: 'report',
        content: {
          shareToken,
          url: decodedText,
          reports: reportsData,
          raw: decodedText,
          formatted: `Reports shared (${reportsData.length})`
        },
        metadata: {
          detectedFormat: 'URL',
          isValid: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('QR code processing error:', error);
      setError(error.message || 'Failed to process QR code');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleScanError = (errorMessage: string) => {
    console.error('QR scan error:', errorMessage);
    setError('Failed to scan QR code. Please try again.');
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <Scan className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Scan QR Code</h1>
          <p className="text-gray-600">Scan QR codes to access shared reports</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Scan QR Code</h2>
          <div id="qr-reader" className="w-full max-w-md mx-auto">
            <QRScanner 
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              preferredFormat="jpeg"
              imageQuality={0.8}
            />
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Position the QR code within the frame to scan
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-md flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        )}
        
        {scannedData && sharedReports.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Shared Reports</h2>
            <div className="space-y-4">
              {sharedReports.map((report) => (
                <div key={report.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-800">{report.report_name}</h3>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{report.category}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      {report.file_url && (
                        <a
                          href={report.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          View Report
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 