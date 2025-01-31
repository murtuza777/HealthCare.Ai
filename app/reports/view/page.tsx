'use client';

import { useState } from 'react';
import QRScanner from '@/app/components/QRScanner';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { parseQRContent, formatQRContent } from '@/app/utils/qrParser';

interface ScannedData {
    imageData: {
        dataUrl: string;
        format: string;
        width: number;
        height: number;
        size: number;
    };
    timestamp: string;
    parsedContent: any;
    rawContent: string;
}

export default function GetReportsPage() {
    const [scannedData, setScannedData] = useState<ScannedData | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleScanSuccess = async (decodedText: string, imageData: ScannedData['imageData']) => {
        setIsLoading(true);
        setError('');
        
        try {
            const parsedData = parseQRContent(decodedText);
            
            setScannedData({
                imageData,
                timestamp: new Date().toLocaleString(),
                parsedContent: parsedData,
                rawContent: decodedText
            });

            if (parsedData.error) {
                setError(parsedData.error);
            }
        } catch (err) {
            setError('Failed to process the scanned content. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleScanError = (error: string) => {
        setError('Failed to scan QR code. Please try again.');
    };

    const handleDownload = () => {
        if (!scannedData) return;

        // Create a download link for the image
        const link = document.createElement('a');
        link.href = scannedData.imageData.dataUrl;
        link.download = `scanned-qr-${new Date().getTime()}.${scannedData.imageData.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadContent = () => {
        if (!scannedData) return;

        // Create a text file with the formatted content
        const formattedContent = formatQRContent(scannedData.parsedContent);
        const blob = new Blob([formattedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-content-${new Date().getTime()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const formatImageSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">Get Reports</h1>
                    <p className="text-gray-600">Scan QR code to access reports</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Scan QR Code</h2>
                    <QRScanner 
                        onScanSuccess={handleScanSuccess}
                        onScanError={handleScanError}
                        preferredFormat="jpeg"
                        imageQuality={0.8}
                    />
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-md flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                    </div>
                )}

                {scannedData && (
                    <div className="mt-8 space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Scanned Content</h3>
                            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                                {formatQRContent(scannedData.parsedContent)}
                            </div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    onClick={handleDownloadContent}
                                    className="text-sm text-red-600 hover:text-red-700"
                                >
                                    Download Content
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Scanned Image</h3>
                            <div className="border rounded-lg p-4">
                                <div className="aspect-w-16 aspect-h-9 mb-4">
                                    <img 
                                        src={scannedData.imageData.dataUrl} 
                                        alt="Scanned QR Code"
                                        className="rounded-lg object-contain w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                        <div>
                                            <p>Format: {scannedData.imageData.format.toUpperCase()}</p>
                                            <p>Size: {formatImageSize(scannedData.imageData.size)}</p>
                                            <p>Dimensions: {scannedData.imageData.width} x {scannedData.imageData.height}</p>
                                        </div>
                                        <p>Scanned at: {scannedData.timestamp}</p>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleDownload}
                                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download Image
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
