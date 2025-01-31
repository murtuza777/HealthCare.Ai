'use client';

import { useState } from 'react';
import { QrCode, Share2 } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface PatientData {
  type: string;
  id: string;
  info: {
    name: string;
    dateOfBirth: string;
    gender?: string;
    contactNumber?: string;
  };
  createdAt: string;
}

export default function SharePatientIDPage() {
  const [scannedData, setScannedData] = useState<PatientData | null>(null);
  const [error, setError] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file);
      const parsedData = JSON.parse(result) as PatientData;
      
      if (parsedData.type !== 'PATIENT_ID') {
        throw new Error('Invalid QR code: Not a patient ID');
      }

      setScannedData(parsedData);
      setError('');
    } catch (err) {
      setError('Failed to scan QR code. Please make sure it\'s a valid patient ID QR code.');
      setScannedData(null);
    }
  };

  const generateShareLink = async () => {
    if (!scannedData) return;

    setIsSharing(true);
    try {
      // In a real app, this would create a secure, temporary share link
      const shareToken = Math.random().toString(36).substring(2, 15);
      const shareUrl = `${window.location.origin}/shared-patient/${shareToken}`;
      setShareLink(shareUrl);
    } catch (err) {
      setError('Failed to generate share link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <Share2 className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Share Patient ID</h1>
          <p className="text-gray-600">Share patient ID securely with healthcare providers</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-8">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <QrCode className="w-12 h-12 mb-4 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">Patient ID QR code</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {scannedData && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Patient ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scannedData.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scannedData.info.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                    <dd className="mt-1 text-sm text-gray-900">{scannedData.info.dateOfBirth}</dd>
                  </div>
                  {scannedData.info.gender && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Gender</dt>
                      <dd className="mt-1 text-sm text-gray-900">{scannedData.info.gender}</dd>
                    </div>
                  )}
                  {scannedData.info.contactNumber && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contact Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{scannedData.info.contactNumber}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div>
              <button
                onClick={generateShareLink}
                disabled={isSharing}
                className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                  isSharing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isSharing ? 'Generating Share Link...' : 'Generate Share Link'}
              </button>
            </div>

            {shareLink && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Share Link</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 p-2 text-sm border rounded-md bg-gray-50"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      alert('Link copied to clipboard!');
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  This link will expire in 24 hours
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 