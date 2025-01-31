'use client';

import { PatientProvider } from './context/PatientContext'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PatientProvider>
      {children}
    </PatientProvider>
  )
} 