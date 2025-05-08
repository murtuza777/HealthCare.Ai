'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Report = {
  id: string;
  report_name: string;
  category: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_url?: string;
  created_at: string;
};

export default function ViewSharedReportPage() {
  const params = useParams();
  const shareToken = params.token as string;
  
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<{
    expires_at: string;
    created_at: string;
  } | null>(null);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    if (shareToken) {
      fetchSharedReports(shareToken);
    }
  }, [shareToken]);
  
  const fetchSharedReports = async (token: string) => {
    setIsLoading(true);
    try {
      // Fetch the share record
      const { data: shareData, error: shareError } = await supabase
        .from('shared_reports')
        .select('*')
        .eq('share_token', token)
        .single();
        
      if (shareError) {
        throw new Error('Invalid or expired share link');
      }
      
      // Check if the share has expired
      if (new Date(shareData.expires_at) < new Date()) {
        throw new Error('This shared link has expired');
      }
      
      setShareInfo({
        expires_at: shareData.expires_at,
        created_at: shareData.created_at
      });
      
      // Fetch the actual report metadata
      const { data: reportsData, error: reportsError } = await supabase
        .from('report_metadata')
        .select('*')
        .in('id', shareData.reports);
        
      if (reportsError) {
        throw new Error('Could not load the reports');
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
      
      setReports(reportsWithUrls);
    } catch (error: any) {
      console.error('Error fetching shared reports:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const getFileIcon = (fileType: string) => {
    // Logic to determine which icon to show based on file type
    return <FileText className="h-6 w-6" />;
  };
  
  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    // Calculate the difference in days
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Expires today';
    return `Expires in ${diffDays} days`;
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <FileText className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Shared Medical Reports</h1>
          <p className="text-gray-600">View shared healthcare reports</p>
        </div>
      </div>
      
      {shareInfo && (
        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-md p-4">
          <p className="text-sm text-blue-800">
            These reports were shared with you on {new Date(shareInfo.created_at).toLocaleDateString()}.
            <span className="ml-2 font-medium">{formatExpiryDate(shareInfo.expires_at)}</span>
          </p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 bg-red-100 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-medium text-red-800 mb-2">Access Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-gray-500">
              The link may have expired or the reports may no longer be available.
            </p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 bg-gray-100 rounded-full mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">No Reports Found</h2>
            <p className="text-gray-500">
              There are no reports associated with this share link.
            </p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {reports.length} {reports.length === 1 ? 'Report' : 'Reports'} Available
              </h2>
              <p className="text-sm text-gray-500">
                Click on each report to view or download
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {reports.map((report) => (
                <div key={report.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-start">
                    <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center mr-4">
                      {getFileIcon(report.file_type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-gray-900">{report.report_name}</h3>
                      <div className="flex flex-wrap items-center mt-1 gap-2">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs text-gray-600">
                          {report.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          Added on {new Date(report.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(report.file_size)}
                        </span>
                      </div>
                      
                      {report.file_url && (
                        <div className="mt-3">
                          <a
                            href={report.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            {report.file_type === 'application/pdf' ? 'View PDF' : 'View Image'}
                          </a>
                          <a
                            href={report.file_url}
                            download={report.report_name}
                            className="inline-flex items-center ml-2 px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Download className="mr-1.5 h-4 w-4" />
                            Download
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 