'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ScanLine,
  Upload,
  Scan,
  FolderOpen
} from 'lucide-react';
import FeatureCard from '@/app/components/FeatureCard';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../context/AuthContext';
import { usePatient } from '../context/PatientContext';
import LoadingAnimation from '../components/LoadingAnimation';

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
    return <LoadingAnimation text="PREPARING DASHBOARD" fullScreen={true} />;
  }

  // Continue even without user/profile in forced render mode
  if (!user && !forceRender) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 -z-10">
          <HealthAnimatedBackground />
        </div>
        <div className="text-center z-10">
          <p className="text-gray-100 text-xl">Please log in to access your dashboard.</p>
          <Link href="/auth/login" className="mt-4 inline-block bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition-all duration-300">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Animated Healthcare Background */}
      <div className="fixed inset-0 -z-10">
        <HealthAnimatedBackground />
      </div>
      
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Healthcare.AI</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-100">
                Welcome, {profile?.name || profile?.email || user?.email?.split('@')[0] || 'User'}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEmergencyForm(true)}
                className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 rounded-full hover:from-red-700 hover:to-red-600 shadow-md hover:shadow-lg transition-all duration-300"
              >
                Emergency
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={signOut}
                className="px-4 py-2 text-gray-100 hover:text-white transition-colors duration-300"
              >
                Sign Out
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Emergency Contact Form Modal */}
      {showEmergencyForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl max-w-md w-full p-6 shadow-2xl"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Emergency Contact</h3>
            <form onSubmit={handleEmergencyContact}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-white">Description</label>
                <textarea
                  name="description"
                  className="mt-1 block w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-md shadow-sm p-2 text-white"
                  rows={3}
                  placeholder="Describe the emergency situation..."
                  required
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowEmergencyForm(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 rounded-full"
                >
                  Contact Emergency
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="backdrop-blur-md bg-black/20 rounded-full p-1">
          <nav className="flex space-x-1 justify-center">
            <AnimatePresence mode="sync">
              {['overview', 'heartguard', 'reports', 'caretaker', 'timeline'].map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full relative font-medium text-sm whitespace-nowrap ${
                    activeTab === tab ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="tabIndicator"
                      className="absolute inset-0 bg-red-600 rounded-full"
                      initial={false}
                      animate={{ opacity: 1 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  {tab === 'overview' ? 'Patient Overview' : 
                   tab === 'heartguard' ? 'HeartGuard AI' : 
                   tab === 'reports' ? 'Reports' : 
                   tab === 'caretaker' ? 'Caretaker' : 'Timeline'}
                </motion.button>
              ))}
            </AnimatePresence>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="sync">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl"
          >
            {activeTab === 'overview' ? (
              <div>
                <div className="flex justify-between mb-4">
                  <div className="flex flex-wrap items-center">
                    <h2 className="text-xl md:text-2xl font-bold text-white">Patient Dashboard</h2>
                    
                    {/* Add a small indicator that AI system is using Gemini */}
                    <div className="ml-3 flex items-center text-xs text-gray-400">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></div>
                      AI: Gemini
                    </div>
                  </div>
                </div>
                
                <PatientOverview patientId={user?.id || ''} />
              </div>
            ) : activeTab === 'heartguard' ? (
              <HealthGuardianChat />
            ) : activeTab === 'reports' ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Reports Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      icon: Upload,
                      title: "Add Reports",
                      description: "Upload and store your medical reports securely",
                      href: `/reports/add?userId=${user?.id || ''}`
                    },
                    {
                      icon: QrCode,
                      title: "QR Code",
                      description: "Generate QR codes to share your medical reports",
                      href: `/reports/qr-code?userId=${user?.id || ''}`
                    },
                    {
                      icon: Scan,
                      title: "Scan QR Code",
                      description: "Scan QR codes to access shared reports",
                      href: `/reports/scan-qr?userId=${user?.id || ''}`
                    },
                    {
                      icon: FolderOpen,
                      title: "Reports Gallery",
                      description: "View and manage all your stored medical reports",
                      href: `/reports/gallery?userId=${user?.id || ''}`
                    }
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
            ) : activeTab === 'caretaker' ? (
              <CaretakerManagement />
            ) : (
              <HealthTimeline />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// New animated background component with a more professional design
function HealthAnimatedBackground() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-black via-gray-900 to-blue-900 overflow-hidden">
      {/* ECG Line Animation - increased opacity and stroke width */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <motion.path
          d="M0,540 L320,540 L340,400 L360,680 L380,400 L400,680 L420,540 L1920,540"
          fill="none"
          stroke="#ff3333"
          strokeWidth="5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1],
            opacity: [0.5, 1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </svg>
      
      {/* Medical crosses and symbols - increased size and opacity */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={`cross-${i}`}
          className="absolute text-red-400"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.4 + (Math.random() * 0.2),
            fontSize: `${32 + Math.random() * 20}px`,
            fontWeight: 'bold'
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: 5 + (Math.random() * 5),
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2
          }}
        >
          +
        </motion.div>
      ))}
      
      {/* Grid lines for a medical dashboard feel */}
      <div className="absolute inset-0 bg-grid opacity-15"></div>
      
      {/* Floating particles - increased size and opacity */}
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            width: 2 + (Math.random() * 4),
            height: 2 + (Math.random() * 4),
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.15 + (Math.random() * 0.25),
            backgroundColor: i % 3 === 0 ? '#ff4444' : i % 3 === 1 ? '#4b93ff' : '#ffffff'
          }}
          animate={{
            y: [0, -10, 0],
            x: [0, Math.random() * 10 - 5, 0],
            opacity: [0.15, 0.4, 0.15]
          }}
          transition={{
            duration: 5 + (Math.random() * 5),
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 3
          }}
        />
      ))}
      
      {/* Pulsing circles resembling medical readings - increased opacity */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute rounded-full border-2 border-blue-400/40"
          style={{
            left: `${10 + (Math.random() * 80)}%`,
            top: `${10 + (Math.random() * 80)}%`,
            opacity: 0.1 + (Math.random() * 0.15)
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 0.3, 0]
          }}
          transition={{
            duration: 5 + (Math.random() * 5),
            repeat: Infinity,
            ease: "easeOut",
            delay: Math.random() * 5
          }}
        />
      ))}
      
      {/* Subtle data waves - increased opacity */}
      <svg className="absolute bottom-0 w-full h-1/3 opacity-15" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <motion.path
          d="M0,160 C320,300,420,240,640,160 C860,80,960,120,1280,160 L1440,160 L1440,320 L0,320 Z"
          fill="#4b93ff"
          initial={{ y: 10 }}
          animate={{ y: [10, -10, 10] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.path
          d="M0,220 C140,180,420,120,640,220 C860,320,1120,280,1280,240 L1440,220 L1440,320 L0,320 Z"
          fill="#2550be"
          initial={{ y: -5 }}
          animate={{ y: [-5, 5, -5] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
      </svg>
      
      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent"></div>
    </div>
  );
}
