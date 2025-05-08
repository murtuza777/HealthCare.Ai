'use client';

import { useState, useEffect } from 'react';
import { QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Report = {
  id: string;
  report_name: string;
  category: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
};

export default function QRCodePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCode, setQrCode] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    fetchReports();
  }, []);
  
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to view your reports');
      }
      
      const { data, error } = await supabase
        .from('report_metadata')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectReport = (reportId: string) => {
    setSelectedReports(prevSelected => {
      if (prevSelected.includes(reportId)) {
        return prevSelected.filter(id => id !== reportId);
      } else {
        return [...prevSelected, reportId];
      }
    });
  };
  
  const generateQRCode = async () => {
    if (selectedReports.length === 0) {
      alert('Please select at least one report to share');
      return;
    }
    
    setIsGenerating(true);
    try {
      // Generate a unique share token
      const shareToken = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Get the selected report details
      const selectedReportDetails = reports.filter(report => selectedReports.includes(report.id));
      
      // Create a share record in the database
      const { error } = await supabase
        .from('shared_reports')
        .insert({
          share_token: shareToken,
          reports: selectedReportDetails.map(report => report.id),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          created_at: new Date()
        });
        
      if (error) {
        throw error;
      }
      
      // Create a shareable link
      const shareUrl = `${window.location.origin}/reports/view-shared/${shareToken}`;
      setShareableLink(shareUrl);
      setQrCode(shareUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const downloadQRCode = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `healthcare-reports-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <QrCode className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Generate QR Code</h1>
          <p className="text-gray-600">Share your medical reports securely via QR code</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Select Reports to Share</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">You don't have any reports yet</p>
              <a
                href="/reports/add"
                className="mt-2 inline-block text-red-600 hover:text-red-800"
              >
                Upload your first report
              </a>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {reports.map((report) => (
                <label key={report.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(report.id)}
                    onChange={() => handleSelectReport(report.id)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{report.report_name}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">{report.category}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={generateQRCode}
          disabled={isGenerating || selectedReports.length === 0}
          className={`w-full py-2.5 px-4 rounded-md text-white font-medium ${
            isGenerating || selectedReports.length === 0
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isGenerating ? 'Generating...' : 'Generate QR Code'}
        </button>
        
        {qrCode && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your QR Code</h2>
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                <QRCodeSVG
                  value={qrCode}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <div className="w-full space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareableLink}
                    readOnly
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareableLink);
                      alert('Link copied to clipboard');
                    }}
                    className="p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Copy
                  </button>
                </div>
                
                <button
                  onClick={downloadQRCode}
                  className="flex items-center justify-center w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </button>
                
                <p className="text-xs text-gray-500 text-center">
                  This QR code and link will be valid for 7 days
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 