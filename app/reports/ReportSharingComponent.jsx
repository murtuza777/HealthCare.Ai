import React, { useState } from 'react';
import { useReportSharing } from './shareReports';

const ReportSharingComponent = ({ reports }) => {
    const { selectedReports, handleReportSelection, shareSelectedReports } = useReportSharing();
    const [shareLink, setShareLink] = useState('');
    const [error, setError] = useState('');

    const handleShare = async () => {
        try {
            setError('');
            const link = await shareSelectedReports();
            setShareLink(link);
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Share Reports</h2>
            
            {/* Report Selection Section */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Select Reports to Share</h3>
                <div className="space-y-2">
                    {reports.map(report => (
                        <div key={report.id} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`report-${report.id}`}
                                checked={selectedReports.includes(report.id)}
                                onChange={() => handleReportSelection(report.id)}
                                className="mr-2"
                            />
                            <label htmlFor={`report-${report.id}`}>
                                {report.name}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Share Button */}
            <button
                onClick={handleShare}
                disabled={selectedReports.length === 0}
                className={`px-4 py-2 rounded ${
                    selectedReports.length === 0
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
            >
                Generate Share Link
            </button>

            {/* Error Message */}
            {error && (
                <div className="mt-4 text-red-500">
                    {error}
                </div>
            )}

            {/* Share Link Display */}
            {shareLink && (
                <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Share Link</h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={shareLink}
                            readOnly
                            className="flex-1 p-2 border rounded"
                        />
                        <button
                            onClick={() => navigator.clipboard.writeText(shareLink)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                            Copy
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        This link will expire in 24 hours
                    </p>
                </div>
            )}
        </div>
    );
};

export default ReportSharingComponent;
