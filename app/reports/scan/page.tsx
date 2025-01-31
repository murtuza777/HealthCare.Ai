'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';

export default function ScanReportsPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<{ success: boolean; message: string; error?: string; data: { fileName: string; processedDate: string; type: string; size: number } } | null>(null);

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
      // Here you would typically upload the file to your server
      console.log('File selected:', file);
    } else {
      alert('Please upload a PDF or image file');
    }
  };

  const processReport = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    try {
      // Create a FormData instance to send the file
      const formData = new FormData();
      formData.append('file', uploadedFile);

      // In a real application, you would send this to your backend
      // For now, we'll simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

      setProcessedResult({
        success: true,
        message: 'Report processed successfully',
        data: {
          fileName: uploadedFile.name,
          processedDate: new Date().toLocaleString(),
          type: uploadedFile.type,
          size: uploadedFile.size
        }
      });
    } catch (error) {
      setProcessedResult({
        success: false,
        message: 'Failed to process report. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: {
          fileName: uploadedFile.name,
          processedDate: new Date().toLocaleString(),
          type: uploadedFile.type,
          size: uploadedFile.size
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <Upload className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Scan Reports</h1>
          <p className="text-gray-600">Upload and digitize your medical reports</p>
        </div>
      </div>

      <div
        className={`max-w-2xl mx-auto mt-8 p-8 border-2 border-dashed rounded-lg text-center ${
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

      {uploadedFile && (
        <div className="max-w-2xl mx-auto mt-8 p-4 bg-white rounded-lg shadow">
          <h4 className="font-medium text-gray-900">Uploaded File:</h4>
          <p className="text-gray-600">{uploadedFile.name}</p>
          <div className="mt-4">
            <button 
              onClick={processReport}
              disabled={isProcessing}
              className={`px-4 py-2 text-white rounded-md ${
                isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Process Report'}
            </button>
          </div>
        </div>
      )}

      {processedResult && (
        <div className={`max-w-2xl mx-auto mt-4 p-4 rounded-lg ${
          processedResult.success ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <h4 className={`font-medium ${
            processedResult.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {processedResult.success ? 'Success!' : 'Error'}
          </h4>
          <p className={`${
            processedResult.success ? 'text-green-700' : 'text-red-700'
          }`}>
            {processedResult.message}
          </p>
          {processedResult.success && (
            <div className="mt-4 text-sm text-gray-600">
              <p>File: {processedResult.data.fileName}</p>
              <p>Processed: {processedResult.data.processedDate}</p>
              <p>Type: {processedResult.data.type}</p>
              <p>Size: {Math.round(processedResult.data.size / 1024)} KB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
