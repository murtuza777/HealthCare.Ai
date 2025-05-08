'use client';

import { useState } from 'react';
import { Upload, AlertCircle, Check } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AddReportsPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportCategory, setReportCategory] = useState('General');
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    data?: {
      fileName: string;
      path: string;
      size: number;
      type: string;
      category: string;
    }
  } | null>(null);

  const supabase = createClientComponentClient();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Only accept PDF and image files
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      setUploadedFile(file);
      // Generate a default report name based on the file name
      const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setReportName(fileName);
    } else {
      alert('Please upload a PDF or image file');
    }
  };

  const uploadReport = async () => {
    if (!uploadedFile || !reportName) {
      alert('Please select a file and enter a report name');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to upload reports');
      }

      // Create a unique file path
      const fileExt = uploadedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${reportName.replace(/\s+/g, '-').toLowerCase()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, uploadedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Store metadata in the database
      const { error: dbError } = await supabase
        .from('report_metadata')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_path: filePath,
          file_type: uploadedFile.type,
          file_size: uploadedFile.size,
          category: reportCategory,
          report_name: reportName,
          created_at: new Date()
        });

      if (dbError) {
        throw dbError;
      }

      // Success
      setUploadResult({
        success: true,
        message: 'Report uploaded successfully',
        data: {
          fileName: reportName,
          path: filePath,
          size: uploadedFile.size,
          type: uploadedFile.type,
          category: reportCategory
        }
      });

      // Reset form
      setUploadedFile(null);
      setReportName('');
      setReportCategory('General');
    } catch (error: any) {
      setUploadResult({
        success: false,
        message: error.message || 'Failed to upload report'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <Upload className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Add Reports</h1>
          <p className="text-gray-600">Upload and store your medical reports securely</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {!uploadedFile ? (
          <div
            className={`p-8 border-2 border-dashed rounded-lg text-center ${
              isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drag and drop your report here
            </h3>
            <p className="text-gray-500 mb-4">or</p>
            <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 cursor-pointer">
              <span>Browse Files</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleFileInput}
              />
            </label>
            <p className="mt-2 text-sm text-gray-500">
              Supported formats: PDF, JPG, PNG
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Selected File:</h4>
              <p className="text-gray-600">{uploadedFile.name}</p>
              <p className="text-sm text-gray-500">
                Size: {Math.round(uploadedFile.size / 1024)} KB
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="reportName" className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name
                </label>
                <input
                  type="text"
                  id="reportName"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter report name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="reportCategory" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="reportCategory"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="General">General</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={uploadReport}
                disabled={isUploading}
                className={`flex-1 py-2 px-4 text-white rounded-md ${
                  isUploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Upload Report'}
              </button>
              
              <button
                onClick={() => setUploadedFile(null)}
                className="py-2 px-4 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {uploadResult && (
          <div className={`mt-6 p-4 rounded-lg ${
            uploadResult.success ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
          }`}>
            <div className="flex items-start space-x-2">
              {uploadResult.success 
                ? <Check className="w-5 h-5 text-green-500 mt-0.5" /> 
                : <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              }
              <div>
                <h3 className={`text-sm font-medium ${
                  uploadResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {uploadResult.success ? 'Success' : 'Error'}
                </h3>
                <p className={`text-sm ${
                  uploadResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {uploadResult.message}
                </p>
                {uploadResult.success && uploadResult.data && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Report Name: {uploadResult.data.fileName}</p>
                    <p>Category: {uploadResult.data.category}</p>
                    <p>Size: {Math.round(uploadResult.data.size / 1024)} KB</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 