'use client';

import { 
  FileText, 
  QrCode, 
  Scan,
  Upload,
  FolderOpen
} from 'lucide-react';
import FeatureCard from '@/app/components/FeatureCard';

export default function ReportsPage() {
  const features = [
    {
      icon: Upload,
      title: "Add Reports",
      description: "Upload and store your medical reports securely",
      href: "/reports/add"
    },
    {
      icon: QrCode,
      title: "QR Code",
      description: "Generate QR codes to share your medical reports",
      href: "/reports/qr-code"
    },
    {
      icon: Scan,
      title: "Scan QR Code",
      description: "Scan QR codes to access shared reports",
      href: "/reports/scan-qr"
    },
    {
      icon: FolderOpen,
      title: "Reports Gallery",
      description: "View and manage all your stored medical reports",
      href: "/reports/gallery"
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
