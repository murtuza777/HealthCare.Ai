'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, FileText, Download, Trash2, QrCode, Search } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

type Report = {
  id: string;
  user_id: string;
  report_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  created_at: string;
};

export default function ReportsGalleryPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>([]);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    fetchReports();
  }, []);
  
  // Filter reports when search term or category changes
  useEffect(() => {
    filterReports();
  }, [searchTerm, selectedCategory, reports]);
  
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
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data?.map(report => report.category) || [])
      );
      setCategories(['All', ...uniqueCategories]);
      
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const filterReports = () => {
    let filtered = [...reports];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.report_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(report => report.category === selectedCategory);
    }
    
    setFilteredReports(filtered);
  };
  
  const getReportDownloadUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('reports')
      .createSignedUrl(filePath, 60); // URL valid for 60 seconds
      
    if (error) {
      console.error('Error creating download URL:', error);
      return null;
    }
    
    return data.signedUrl;
  };
  
  const handleDownload = async (report: Report) => {
    try {
      const downloadUrl = await getReportDownloadUrl(report.file_path);
      
      if (!downloadUrl) {
        throw new Error('Failed to generate download link');
      }
      
      // Create an anchor element and trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = report.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the report');
    }
  };
  
  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }
    
    setIsDeletingId(reportId);
    try {
      // Find the report to delete
      const reportToDelete = reports.find(r => r.id === reportId);
      if (!reportToDelete) {
        throw new Error('Report not found');
      }
      
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('reports')
        .remove([reportToDelete.file_path]);
        
      if (storageError) {
        throw storageError;
      }
      
      // Delete the metadata from the database
      const { error: dbError } = await supabase
        .from('report_metadata')
        .delete()
        .eq('id', reportId);
        
      if (dbError) {
        throw dbError;
      }
      
      // Update the local state
      setReports(reports.filter(r => r.id !== reportId));
      
    } catch (error: any) {
      console.error('Error deleting report:', error);
      alert(`Failed to delete the report: ${error.message}`);
    } finally {
      setIsDeletingId(null);
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <FolderOpen className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Reports Gallery</h1>
          <p className="text-gray-600">View and manage your medical reports</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Filters and Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Filter:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <Link
              href="/reports/add"
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              Add Report
            </Link>
          </div>
        </div>
        
        {/* Reports List or Loading State */}
        <div className="px-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-500">{error}</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Reports Found</h3>
              {reports.length > 0 ? (
                <p className="text-gray-500">Try changing your search or filter criteria</p>
              ) : (
                <div>
                  <p className="text-gray-500 mb-4">You haven't uploaded any reports yet</p>
                  <Link
                    href="/reports/add"
                    className="inline-flex items-center text-red-600 hover:text-red-800"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Upload your first report
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-gray-500 mb-4">
                Showing {filteredReports.length} of {reports.length} reports
              </p>
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div 
                    key={report.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex flex-col md:flex-row md:items-center">
                      <div className="flex items-start flex-1">
                        <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                          <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-800">{report.report_name}</h3>
                          <div className="flex flex-wrap items-center mt-1 space-x-2">
                            <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs text-gray-600">
                              {report.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(report.file_size)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-3 md:mt-0">
                        <button
                          onClick={() => handleDownload(report)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <Link
                          href={`/reports/qr-code?preselect=${report.id}`}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          title="Share via QR Code"
                        >
                          <QrCode className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={isDeletingId === report.id}
                          className={`p-2 rounded-full ${
                            isDeletingId === report.id
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                          }`}
                          title="Delete"
                        >
                          {isDeletingId === report.id ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination could be added here if needed */}
        <div className="p-4 border-t border-gray-200 text-center text-sm text-gray-500">
          {reports.length > 0 && `Total: ${reports.length} reports`}
        </div>
      </div>
    </div>
  );
} 