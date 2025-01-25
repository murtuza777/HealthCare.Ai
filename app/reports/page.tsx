'use client';

import { 
  FileText, 
  QrCode, 
  Share2, 
  UserSquare2, 
  ScanLine
} from 'lucide-react';
import FeatureCard from '@/app/components/FeatureCard';

export default function ReportsPage() {
  const features = [
    {
      icon: ScanLine,
      title: "Scan Reports",
      description: "Upload and digitize medical reports securely",
      href: "/reports/scan"
    },
    {
      icon: Share2,
      title: "Share Report",
      description: "Share reports via QR code for big screen viewing",
      href: "/reports/share"
    },
    {
      icon: FileText,
      title: "Get Reports",
      description: "Access reports instantly by scanning QR codes",
      href: "/reports/view"
    },
    {
      icon: UserSquare2,
      title: "Get Patient ID",
      description: "Generate unique patient IDs via QR code",
      href: "/reports/patient-id"
    },
    {
      icon: QrCode,
      title: "Share Patient ID",
      description: "Share patient IDs securely for report access",
      href: "/reports/share-id"
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Reports Management</h2>
        <p className="text-gray-600">Manage your healthcare reports and patient information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            href={feature.href}
          />
        ))}
      </div>
    </div>
  );
}
