export type ContentType = 'url' | 'report' | 'text' | 'json' | 'unknown';

export interface ParsedQRData {
    type: ContentType;
    content: {
        raw: string;
        formatted: string;
        reports?: {
            id: string;
            name: string;
            date: string;
            url?: string;
        }[];
        shareToken?: string;
        expiresAt?: string;
        url?: string;
    };
    metadata: {
        detectedFormat: string;
        isValid: boolean;
        timestamp: string;
    };
    error?: string;
}

// Helper function to validate and format URLs
const validateAndFormatURL = (url: string): { isValid: boolean; formatted: string } => {
    try {
        const parsedUrl = new URL(url);
        return {
            isValid: true,
            formatted: parsedUrl.toString()
        };
    } catch {
        return {
            isValid: false,
            formatted: url
        };
    }
};

// Helper function to validate and format JSON
const validateAndFormatJSON = (json: string): { isValid: boolean; parsed: any } => {
    try {
        const parsed = JSON.parse(json);
        return {
            isValid: true,
            parsed
        };
    } catch {
        return {
            isValid: false,
            parsed: null
        };
    }
};

// Helper function to detect content type
const detectContentType = (content: string): ContentType => {
    // Check if it's a URL
    if (content.startsWith('http://') || content.startsWith('https://')) {
        return 'url';
    }

    // Check if it's JSON
    try {
        JSON.parse(content);
        return 'json';
    } catch {}

    // Check if it's a report (based on structure)
    if (content.includes('reports') || content.includes('shareToken')) {
        return 'report';
    }

    // Default to text if no other format is detected
    return 'text';
};

export const parseQRContent = (qrContent: string): ParsedQRData => {
    const contentType = detectContentType(qrContent);
    const timestamp = new Date().toISOString();

    // Base structure for response
    const baseResponse: ParsedQRData = {
        type: contentType,
        content: {
            raw: qrContent,
            formatted: qrContent
        },
        metadata: {
            detectedFormat: contentType,
            isValid: true,
            timestamp
        }
    };

    try {
        switch (contentType) {
            case 'url': {
                const { isValid, formatted } = validateAndFormatURL(qrContent);
                if (!isValid) {
                    throw new Error('Invalid URL format');
                }

                const url = new URL(formatted);
                baseResponse.content.url = formatted;
                baseResponse.content.formatted = `URL: ${formatted}`;

                // Check if it's a report sharing URL
                if (url.pathname.includes('/shared-reports/')) {
                    baseResponse.type = 'report';
                    const shareToken = url.pathname.split('/').pop();
                    baseResponse.content.shareToken = shareToken;
                    
                    // Try to decode report data from URL parameters
                    const reportsData = url.searchParams.get('data');
                    if (reportsData) {
                        try {
                            const reports = JSON.parse(atob(reportsData));
                            baseResponse.content.reports = reports;
                            baseResponse.content.formatted = formatReportData(reports);
                        } catch (e) {
                            console.error('Failed to parse reports data:', e);
                        }
                    }
                }
                break;
            }

            case 'json': {
                const { isValid, parsed } = validateAndFormatJSON(qrContent);
                if (!isValid) {
                    throw new Error('Invalid JSON format');
                }

                if (parsed.reports) {
                    baseResponse.type = 'report';
                    baseResponse.content.reports = parsed.reports;
                    baseResponse.content.shareToken = parsed.shareToken;
                    baseResponse.content.expiresAt = parsed.expiresAt;
                    baseResponse.content.formatted = formatReportData(parsed.reports);
                } else {
                    baseResponse.content.formatted = JSON.stringify(parsed, null, 2);
                }
                break;
            }

            case 'report': {
                const { isValid, parsed } = validateAndFormatJSON(qrContent);
                if (isValid && parsed) {
                    baseResponse.content.reports = parsed.reports;
                    baseResponse.content.formatted = formatReportData(parsed.reports);
                } else {
                    throw new Error('Invalid report format');
                }
                break;
            }

            case 'text':
            default: {
                // Try to clean and format the text
                baseResponse.content.formatted = qrContent.trim();
                break;
            }
        }

        return baseResponse;

    } catch (error) {
        return {
            ...baseResponse,
            type: 'unknown',
            metadata: {
                ...baseResponse.metadata,
                isValid: false
            },
            error: error instanceof Error ? error.message : 'Failed to parse QR code content'
        };
    }
};

const formatReportData = (reports: any[]): string => {
    if (!Array.isArray(reports) || reports.length === 0) {
        return 'No reports available';
    }

    return `Reports Available (${reports.length}):
${reports.map((report, index) => `
${index + 1}. ${report.name}
   Date: ${report.date}
   ${report.url ? `URL: ${report.url}` : ''}`).join('\n')}`;
};

export const formatQRContent = (parsedData: ParsedQRData): string => {
    const { type, content, metadata, error } = parsedData;

    if (error) {
        return `Error: ${error}

Raw Content:
${content.raw}`;
    }

    let formatted = `Type: ${type.toUpperCase()}\n`;
    formatted += `Detected Format: ${metadata.detectedFormat}\n`;
    formatted += `Timestamp: ${new Date(metadata.timestamp).toLocaleString()}\n\n`;

    formatted += 'Content:\n';
    formatted += content.formatted;

    if (content.expiresAt) {
        formatted += `\n\nExpires: ${new Date(content.expiresAt).toLocaleString()}`;
    }

    return formatted;
};
