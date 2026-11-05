'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string, imageData: { 
        dataUrl: string;
        format: string;
        width: number;
        height: number;
        size: number;
    }) => void;
    onScanError?: (error: string) => void;
    preferredFormat?: 'png' | 'jpeg' | 'webp';
    imageQuality?: number;
}

interface ImageProcessingOptions {
    brightness: number;
    contrast: number;
    grayscale: boolean;
    format: 'png' | 'jpeg' | 'webp';
    quality: number;
}

const QRScanner = ({ 
    onScanSuccess, 
    onScanError,
    preferredFormat = 'jpeg',
    imageQuality = 0.8
}: QRScannerProps) => {
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [processingOptions, setProcessingOptions] = useState<ImageProcessingOptions>({
        brightness: 100,
        contrast: 100,
        grayscale: false,
        format: preferredFormat,
        quality: imageQuality
    });

    useEffect(() => {
        // Initialize scanner
        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode("qr-reader");
        }

        // Cleanup on unmount
        return () => {
            if (scannerRef.current && isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [isScanning]);

    const getImageFormat = (dataUrl: string): string => {
        const matches = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,/);
        return matches ? matches[1] : 'unknown';
    };

    const getImageDimensions = (canvas: HTMLCanvasElement): { width: number; height: number } => {
        return {
            width: canvas.width,
            height: canvas.height
        };
    };

    const estimateImageSize = (dataUrl: string): number => {
        // Rough estimation of image size in bytes
        const base64Length = dataUrl.split(',')[1].length;
        return Math.round((base64Length * 3) / 4);
    };

    const convertImage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, format: string, quality: number): string => {
        switch (format.toLowerCase()) {
            case 'png':
                return canvas.toDataURL('image/png');
            case 'webp':
                return canvas.toDataURL('image/webp', quality);
            case 'jpeg':
            default:
                // Fill white background for JPEG (since it doesn't support transparency)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.putImageData(imageData, 0, 0);
                return canvas.toDataURL('image/jpeg', quality);
        }
    };

    const processImage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): string => {
        // Apply image processing effects
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Apply brightness
        const brightnessRatio = processingOptions.brightness / 100;
        // Apply contrast
        const contrastFactor = (processingOptions.contrast + 100) / 100;

        for (let i = 0; i < data.length; i += 4) {
            // Apply brightness
            data[i] = Math.min(255, data[i] * brightnessRatio);     // Red
            data[i + 1] = Math.min(255, data[i + 1] * brightnessRatio); // Green
            data[i + 2] = Math.min(255, data[i + 2] * brightnessRatio); // Blue

            // Apply contrast
            data[i] = Math.min(255, ((data[i] / 255 - 0.5) * contrastFactor + 0.5) * 255);
            data[i + 1] = Math.min(255, ((data[i + 1] / 255 - 0.5) * contrastFactor + 0.5) * 255);
            data[i + 2] = Math.min(255, ((data[i + 2] / 255 - 0.5) * contrastFactor + 0.5) * 255);

            // Apply grayscale if enabled
            if (processingOptions.grayscale) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = data[i + 1] = data[i + 2] = avg;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        
        // Convert to desired format
        return convertImage(canvas, ctx, processingOptions.format, processingOptions.quality);
    };

    const captureImage = async (videoElement: HTMLVideoElement) => {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) throw new Error('Failed to get canvas context');
        
        // Draw the current video frame
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Process and convert the image
        const processedDataUrl = processImage(canvas, ctx);
        
        return {
            dataUrl: processedDataUrl,
            format: getImageFormat(processedDataUrl),
            ...getImageDimensions(canvas),
            size: estimateImageSize(processedDataUrl)
        };
    };

    const startScanning = async () => {
        if (!scannerRef.current) return;

        try {
            setIsScanning(true);
            await scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                async (decodedText) => {
                    const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement;
                    if (!videoElement) {
                        throw new Error('Video element not found');
                    }

                    try {
                        const imageData = await captureImage(videoElement);
                        onScanSuccess(decodedText, imageData);
                        stopScanning();
                    } catch (err) {
                        console.error('Error capturing image:', err);
                        if (onScanError) {
                            onScanError('Failed to capture image');
                        }
                    }
                },
                (errorMessage) => {
                    if (onScanError) {
                        onScanError(errorMessage);
                    }
                }
            );
        } catch (err) {
            console.error('Error starting scanner:', err);
            if (onScanError) {
                onScanError('Failed to start scanner');
            }
            setIsScanning(false);
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                setIsScanning(false);
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
            
            {/* Image Processing Controls */}
            <div className="mt-4 space-y-4 p-4 border rounded-lg bg-gray-50">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Brightness ({processingOptions.brightness}%)
                    </label>
                    <input
                        type="range"
                        min="50"
                        max="150"
                        value={processingOptions.brightness}
                        onChange={(e) => setProcessingOptions(prev => ({
                            ...prev,
                            brightness: parseInt(e.target.value)
                        }))}
                        className="w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contrast ({processingOptions.contrast}%)
                    </label>
                    <input
                        type="range"
                        min="50"
                        max="150"
                        value={processingOptions.contrast}
                        onChange={(e) => setProcessingOptions(prev => ({
                            ...prev,
                            contrast: parseInt(e.target.value)
                        }))}
                        className="w-full"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="grayscale"
                            checked={processingOptions.grayscale}
                            onChange={(e) => setProcessingOptions(prev => ({
                                ...prev,
                                grayscale: e.target.checked
                            }))}
                            className="h-4 w-4 text-red-500 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="grayscale" className="ml-2 block text-sm text-gray-700">
                            Grayscale
                        </label>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <select
                            value={processingOptions.format}
                            onChange={(e) => setProcessingOptions(prev => ({
                                ...prev,
                                format: e.target.value as 'png' | 'jpeg' | 'webp'
                            }))}
                            className="block w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                        >
                            <option value="jpeg">JPEG</option>
                            <option value="png">PNG</option>
                            <option value="webp">WebP</option>
                        </select>

                        <select
                            value={processingOptions.quality}
                            onChange={(e) => setProcessingOptions(prev => ({
                                ...prev,
                                quality: parseFloat(e.target.value)
                            }))}
                            className="block w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                        >
                            <option value="0.6">Low</option>
                            <option value="0.8">Medium</option>
                            <option value="0.9">High</option>
                            <option value="1.0">Best</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex justify-center space-x-4">
                {!isScanning ? (
                    <button
                        onClick={startScanning}
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Start Scanning
                    </button>
                ) : (
                    <button
                        onClick={stopScanning}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                        Stop Scanning
                    </button>
                )}
            </div>
        </div>
    );
};

export default QRScanner;
