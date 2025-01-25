'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';

export default function ScanReportsPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Scan Reports</h2>
        <p className="text-gray-600">Upload your medical reports for digital storage and analysis</p>
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
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              Process Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
