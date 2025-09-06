import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from './context/AuthContext'
import { PatientProvider } from './context/PatientContext'
import { Suspense } from 'react'
import LoadingAnimation from './components/LoadingAnimation'

// Temporarily removed font loading to fix build issues

export const metadata: Metadata = {
  title: 'Healthcare.AI',
  description: 'AI-powered healthcare platform for early disease detection and patient monitoring',
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingAnimation text="INITIALIZING HEALTHCARE.AI" fullScreen={true} />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen">
        <Suspense fallback={<Loading />}>
          <AuthProvider>
            <PatientProvider>
              {children}
            </PatientProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
