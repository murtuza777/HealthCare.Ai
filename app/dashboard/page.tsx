'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import PatientOverview from '../components/PatientOverview';
import HealthGuardianChat from '../components/HealthGuardianChat';
import CaretakerManagement from '../components/CaretakerManagement';
import HealthTimeline from '../components/HealthTimeline';
import Link from 'next/link';
import { 
  FileText, 
  QrCode, 
  Share2, 
  UserSquare2, 
  ScanLine
} from '@/app/components/icons';
import FeatureCard from '@/app/components/FeatureCard';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../context/AuthContext';
import { usePatient } from '../context/PatientContext';

// Type for health profile data
interface HealthProfile {
  user_id: string;
  [key: string]: any;
}

// Type for user data state
interface UserData {
  profile: {
    full_name: string;
    [key: string]: any;
  };
  health: Partial<HealthProfile>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, signOut, isLoading: authLoading } = useAuth();
  const { isLoading: patientLoading } = usePatient();
  const [activeTab, setActiveTab] = useState('overview');
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [forceRender, setForceRender] = useState(false);
  const supabase = createClientComponentClient();
  
  // Add a timeout to force rendering after 5 seconds even if loading states are stuck
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (authLoading || patientLoading) {
        console.log('Dashboard: Force rendering after timeout');
        setForceRender(true);
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [authLoading, patientLoading]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user && !forceRender) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router, forceRender]);

  const handleEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const description = formData.get('description') as string;
    
    if (!description) {
      alert('Please describe the emergency situation');
      return;
    }
    
    try {
      // In a real app, this would send an emergency alert
      const { error } = await supabase
        .from('emergency_alerts')
        .insert([
          {
            user_id: user.id,
            description,
            created_at: new Date().toISOString(),
            status: 'pending'
          }
        ]);
        
      if (error) throw error;
      
      alert('Emergency contact has been notified!');
      setShowEmergencyForm(false);
    } catch (error) {
      console.error('Error submitting emergency alert:', error);
      alert('Failed to send emergency alert. Please try again or call emergency services directly.');
    }
  };

  // Skip the loading screen if forceRender is true
  if ((authLoading || patientLoading) && !forceRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          <button 
            onClick={() => setForceRender(true)}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Force Load Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Continue even without user/profile in forced render mode
  if (!user && !forceRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your dashboard.</p>
          <Link href="/auth/login" className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Healthcare.AI Dashboard</h1>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-red-600">Healthcare.AI</span>
              <span className="ml-4 text-gray-600">
                Welcome, {profile?.name || profile?.email || user?.email?.split('@')[0] || 'User'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowEmergencyForm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Emergency
              </button>
              <button
                onClick={signOut}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Emergency Contact Form Modal */}
      {showEmergencyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Emergency Contact</h2>
            <form onSubmit={handleEmergencyContact}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  className="mt-1 block w-full border rounded-md shadow-sm p-2"
                  rows={3}
                  placeholder="Describe the emergency situation..."
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEmergencyForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  Contact Emergency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Patient Overview
            </button>
            <button
              onClick={() => setActiveTab('heartguard')}
              className={`${
                activeTab === 'heartguard'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              HeartGuard AI
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`${
                activeTab === 'reports'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Reports
            </button>
            <button
              onClick={() => setActiveTab('caretaker')}
              className={`${
                activeTab === 'caretaker'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Caretaker
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`${
                activeTab === 'timeline'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Timeline
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' ? (
            <PatientOverview patientId={user?.id || ''} />
          ) : activeTab === 'heartguard' ? (
            <HealthGuardianChat />
          ) : activeTab === 'reports' ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Reports Management</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      icon: ScanLine,
                      title: "Scan Reports",
                      description: "Upload and digitize medical reports securely",
                      href: `/reports/scan?userId=${user?.id || ''}`
                    },
                    {
                      icon: Share2,
                      title: "Share Report",
                      description: "Share reports via QR code for big screen viewing",
                      href: `/reports/share?userId=${user?.id || ''}`
                    },
                    {
                      icon: FileText,
                      title: "Get Reports",
                      description: "Access reports instantly by scanning QR codes",
                      href: `/reports/view?userId=${user?.id || ''}`
                    },
                    {
                      icon: UserSquare2,
                      title: "Get Patient ID",
                      description: "Generate unique patient IDs via QR code",
                      href: `/reports/patient-id?userId=${user?.id || ''}`
                    },
                    {
                      icon: QrCode,
                      title: "QR Scanner",
                      description: "Scan QR codes for quick access to reports",
                      href: `/reports/scan-id?userId=${user?.id || ''}`
                    },
                  ].map((feature, index) => (
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
            </div>
          ) : activeTab === 'caretaker' ? (
            <CaretakerManagement />
          ) : (
            <HealthTimeline />
          )}
        </motion.div>
      </main>
    </div>
  );
}
