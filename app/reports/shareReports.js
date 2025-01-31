import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { encrypt } from '../utils/encryption';

export const useReportSharing = () => {
    const [selectedReports, setSelectedReports] = useState([]);
    const [sharedLinks, setSharedLinks] = useState({});

    // Function to handle report selection
    const handleReportSelection = (reportId) => {
        setSelectedReports(prev => {
            if (prev.includes(reportId)) {
                return prev.filter(id => id !== reportId);
            } else {
                return [...prev, reportId];
            }
        });
    };

    // Function to generate secure sharing link
    const generateShareLink = async (reports) => {
        try {
            // Generate a unique token for this share
            const shareToken = uuidv4();
            
            // Create an expiry date (24 hours from now)
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 24);

            // Create the share data object
            const shareData = {
                reports,
                createdAt: new Date().toISOString(),
                expiresAt: expiryDate.toISOString(),
                token: shareToken
            };

            // Encrypt the share data
            const encryptedData = encrypt(JSON.stringify(shareData));

            // In a real application, you would save this to your database
            // For now, we'll just store it in state
            const shareLink = `${window.location.origin}/shared-reports/${shareToken}`;
            
            setSharedLinks(prev => ({
                ...prev,
                [shareToken]: {
                    link: shareLink,
                    data: shareData
                }
            }));

            return shareLink;
        } catch (error) {
            console.error('Error generating share link:', error);
            throw new Error('Failed to generate share link');
        }
    };

    // Function to share selected reports
    const shareSelectedReports = async () => {
        if (selectedReports.length === 0) {
            throw new Error('No reports selected');
        }

        return await generateShareLink(selectedReports);
    };

    return {
        selectedReports,
        handleReportSelection,
        shareSelectedReports,
        sharedLinks
    };
};
