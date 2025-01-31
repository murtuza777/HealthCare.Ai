'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserSquare2, Download } from 'lucide-react';

export default function GetPatientIDPage() {
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    contactNumber: ''
  });
  const [generatedID, setGeneratedID] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePatientID = async () => {
    if (!patientInfo.name || !patientInfo.dateOfBirth) {
      alert('Please fill in at least the name and date of birth');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate a unique ID (in a real app, this would be more sophisticated)
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 7);
      const id = `PAT-${timestamp}-${random}`.toUpperCase();

      // Create the QR code content
      const qrContent = JSON.stringify({
        type: 'PATIENT_ID',
        id,
        info: {
          name: patientInfo.name,
          dateOfBirth: patientInfo.dateOfBirth,
          gender: patientInfo.gender,
          contactNumber: patientInfo.contactNumber
        },
        createdAt: new Date().toISOString()
      });

      setGeneratedID(id);
      setQrCode(qrContent);
    } catch (error) {
      alert('Failed to generate patient ID. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `patient-id-${generatedID}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <UserSquare2 className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Get Patient ID</h1>
          <p className="text-gray-600">Generate a unique patient ID with QR code</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  value={patientInfo.name}
                  onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                <input
                  type="date"
                  value={patientInfo.dateOfBirth}
                  onChange={(e) => setPatientInfo({ ...patientInfo, dateOfBirth: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={patientInfo.gender}
                  onChange={(e) => setPatientInfo({ ...patientInfo, gender: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                <input
                  type="tel"
                  value={patientInfo.contactNumber}
                  onChange={(e) => setPatientInfo({ ...patientInfo, contactNumber: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <button
                onClick={generatePatientID}
                disabled={isGenerating}
                className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                  isGenerating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isGenerating ? 'Generating...' : 'Generate Patient ID'}
              </button>
            </div>
          </div>

          {qrCode && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Generated Patient ID</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">ID: {generatedID}</p>
                <div className="flex justify-center mb-4">
                  <QRCodeSVG
                    value={qrCode}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <button
                  onClick={downloadQRCode}
                  className="flex items-center justify-center w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Save this QR code for future reference
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 