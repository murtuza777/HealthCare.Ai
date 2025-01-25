'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import PatientOverview from '../components/PatientOverview';
import HeartGuardChat from '../components/HeartGuardChat';
import Link from 'next/link';
import { 
  FileText, 
  QrCode, 
  Share2, 
  UserSquare2, 
  ScanLine
} from '@/app/components/icons';
import HeartRateChart from '@/components/HeartRateChart';
import FeatureCard from '@/app/components/FeatureCard';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);

  const handleEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send an emergency alert
    alert('Emergency contact has been notified!');
    setShowEmergencyForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">HeartCare Dashboard</h1>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-red-600">Healthcare.AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowEmergencyForm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Emergency
              </button>
              <Link
                href="/"
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Emergency Contact Form Modal */}
      {showEmergencyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Emergency Contact</h2>
            <form onSubmit={handleEmergencyContact}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="mt-1 block w-full border rounded-md shadow-sm p-2"
                  rows={3}
                  placeholder="Describe the emergency situation..."
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
              Overview
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`${
                activeTab === 'chat'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              HeartGuard AI
            </button>
            {['heartguard', 'reports', 'caretaker', 'timeline'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {tab}
              </button>
            ))}
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
            <PatientOverview patientId="123" />
          ) : activeTab === 'chat' ? (
            <HeartGuardChat />
          ) : activeTab === 'heartguard' ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Risk Assessment Card */}
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Risk Assessment</h3>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-green-600 font-medium">Low Risk</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Heart Rate</span>
                          <span className="font-medium">72 BPM</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Blood Pressure</span>
                          <span className="font-medium">120/80</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Cholesterol</span>
                          <span className="font-medium">180 mg/dL</span>
                        </div>
                      </div>
                      <button className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        View Detailed Analysis
                      </button>
                    </div>
                  </div>

                  {/* Emergency Contacts Card */}
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Emergency Contacts</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Dr. Smith</p>
                          <p className="text-sm text-gray-600">Primary Physician</p>
                          <p className="text-sm text-gray-600">+1 234-567-8900</p>
                        </div>
                        <button className="px-4 py-2 text-red-600 hover:text-red-700">
                          Call Now
                        </button>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Sarah Johnson</p>
                          <p className="text-sm text-gray-600">Family Contact</p>
                          <p className="text-sm text-gray-600">+1 234-567-8901</p>
                        </div>
                        <button className="px-4 py-2 text-red-600 hover:text-red-700">
                          Call Now
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI Assistant Section - Full Width */}
                  <div className="lg:col-span-2">
                    <HeartGuardChat />
                  </div>
                </div>
              </div>
            </div>
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
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Caretaker Management</h2>
                  <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                    Add New Caretaker
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">Primary Caretaker</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> Sarah Johnson</p>
                      <p><span className="font-medium">Phone:</span> +1 234-567-8902</p>
                      <p><span className="font-medium">Relationship:</span> Daughter</p>
                      <p><span className="font-medium">Email:</span> sarah.j@email.com</p>
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <button className="text-red-600 hover:text-red-700">Edit</button>
                      <button className="text-red-600 hover:text-red-700">Message</button>
                      <button className="text-red-600 hover:text-red-700">Call</button>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">Notifications Settings</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox text-red-600" defaultChecked />
                        <span className="ml-2">Daily Health Updates</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox text-red-600" defaultChecked />
                        <span className="ml-2">Emergency Alerts</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox text-red-600" defaultChecked />
                        <span className="ml-2">Medication Reminders</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox text-red-600" defaultChecked />
                        <span className="ml-2">Appointment Notifications</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Health Timeline</h2>
                  <div className="flex space-x-3">
                    <select className="border rounded-md px-3 py-1">
                      <option>Today</option>
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                      <option>All Time</option>
                    </select>
                    <button className="text-red-600 hover:text-red-700">Filter</button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="relative">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-600"></div>
                      <div className="ml-4 flex-grow">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">Blood Pressure Check</h3>
                            <p className="text-sm text-gray-600">Today, 9:00 AM - 120/80 mmHg</p>
                          </div>
                          <button className="text-red-600 hover:text-red-700">Details</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-600"></div>
                      <div className="ml-4 flex-grow">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">Medication Reminder</h3>
                            <p className="text-sm text-gray-600">Today, 8:00 AM - Morning Medicine Taken</p>
                          </div>
                          <button className="text-red-600 hover:text-red-700">Details</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-red-600"></div>
                      <div className="ml-4 flex-grow">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">Heart Rate Alert</h3>
                            <p className="text-sm text-gray-600">Yesterday, 3:30 PM - Elevated Heart Rate Detected</p>
                          </div>
                          <button className="text-red-600 hover:text-red-700">Details</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
