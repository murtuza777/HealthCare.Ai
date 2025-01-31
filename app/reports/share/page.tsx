'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2 } from 'lucide-react';
import { createShareableLink } from '@/app/utils/reportSharing';

export default function ShareReportsPage() {
    const [selectedReports, setSelectedReports] = useState([]);
    const [shareLink, setShareLink] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Mock data - replace with actual reports from your database
    const availableReports = [
        { id: 1, name: 'Blood Test Report - Jan 2025', date: '2025-01-15' },
        { id: 2, name: 'X-Ray Report - Jan 2025', date: '2025-01-20' },
        { id: 3, name: 'MRI Scan Report', date: '2025-01-22' },
    ];

    const handleShare = async () => {
        if (selectedReports.length === 0) {
            alert('Please select at least one report to share');
            return;
        }

        setIsLoading(true);
        try {
            const { shareUrl } = await createShareableLink(selectedReports);
            setShareLink(shareUrl);
            setQrCode(shareUrl);
        } catch (error) {
            console.error('Error sharing reports:', error);
            alert('Failed to generate share link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">Share Reports</h1>
                    <p className="text-gray-600">Share your medical reports securely via QR code</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                {/* Report Selection */}
                <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Select Reports to Share</h2>
                    <div className="space-y-3">
                        {availableReports.map((report) => (
                            <label key={report.id} className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedReports([...selectedReports, report]);
                                        } else {
                                            setSelectedReports(selectedReports.filter(r => r.id !== report.id));
                                        }
                                    }}
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">{report.name}</p>
                                    <p className="text-xs text-gray-500">Date: {report.date}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    disabled={isLoading || selectedReports.length === 0}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                        isLoading || selectedReports.length === 0
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600'
                    }`}
                >
                    {isLoading ? 'Generating Share Link...' : 'Generate Share Link'}
                </button>

                {/* QR Code and Share Link Display */}
                {qrCode && (
                    <div className="mt-8 flex flex-col items-center">
                        <QRCodeSVG
                            value={qrCode}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Scan this QR code to view the reports
                        </p>

                        <div className="mt-4 w-full">
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
                            <p className="mt-1 text-xs text-gray-500">
                                This link will expire in 24 hours
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
