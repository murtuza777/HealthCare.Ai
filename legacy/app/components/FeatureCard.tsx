'use client';

import { ElementType } from 'react';
import Link from 'next/link';

interface FeatureCardProps {
  icon: ElementType;
  title: string;
  description: string;
  href: string;
}

export default function FeatureCard({ icon: Icon, title, description, href }: FeatureCardProps) {
  return (
    <Link href={href} className="block">
      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
          <Icon className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </Link>
  );
}
