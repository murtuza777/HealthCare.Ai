import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ShareIcon } from '@heroicons/react/24/outline';

const ShareReportCard = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedReports, setSelectedReports] = useState([]);
    const [shareLink, setShareLink] = useState('');
    const [qrCode, setQrCode] = useState('');

    const handleShare = async () => {
        if (selectedReports.length === 0) {
            alert('Please select at least one report to share');
            return;
        }

        // Generate a unique sharing link
        const uniqueId = Math.random().toString(36).substring(2, 15);
        const shareUrl = `${window.location.origin}/shared-reports/${uniqueId}`;
        setShareLink(shareUrl);
        setQrCode(shareUrl);
        setIsOpen(true);
    };

    return (
        <>
            {/* Main Card */}
            <div 
                onClick={() => setIsOpen(true)}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
                <div className="flex flex-col items-start space-y-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <ShareIcon className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Share Report</h3>
                        <p className="text-sm text-gray-600">Share reports via QR code for big screen viewing</p>
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog 
                    as="div" 
                    className="relative z-10" 
                    onClose={() => setIsOpen(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900"
                                    >
                                        Share Reports
                                    </Dialog.Title>

                                    {/* Report Selection */}
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                            Select Reports to Share
                                        </h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {/* We'll populate this with actual reports */}
                                            {['Report 1', 'Report 2', 'Report 3'].map((report, index) => (
                                                <label 
                                                    key={index}
                                                    className="flex items-center space-x-2"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedReports([...selectedReports, report]);
                                                            } else {
                                                                setSelectedReports(selectedReports.filter(r => r !== report));
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm text-gray-700">{report}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* QR Code Display */}
                                    {qrCode && (
                                        <div className="mt-4 flex flex-col items-center">
                                            <QRCodeSVG
                                                value={qrCode}
                                                size={200}
                                                level="H"
                                                includeMargin={true}
                                            />
                                            <p className="mt-2 text-sm text-gray-500">
                                                Scan this QR code to view the reports
                                            </p>
                                        </div>
                                    )}

                                    {/* Share Link */}
                                    {shareLink && (
                                        <div className="mt-4">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={shareLink}
                                                    className="flex-1 p-2 text-sm border rounded-md"
                                                />
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(shareLink)}
                                                    className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">
                                                This link will expire in 24 hours
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                            onClick={handleShare}
                                        >
                                            Generate Share Link
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default ShareReportCard;
