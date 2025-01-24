'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-semibold text-gray-900">Patient Dashboard</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Heart Rate Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Heart Rate</h3>
            <div className="text-3xl font-bold text-red-600">72 BPM</div>
            <p className="text-sm text-gray-500 mt-1">Normal range</p>
          </div>

          {/* Blood Pressure Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Blood Pressure</h3>
            <div className="text-3xl font-bold text-red-600">120/80</div>
            <p className="text-sm text-gray-500 mt-1">Normal range</p>
          </div>

          {/* ECG Status Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">ECG Status</h3>
            <div className="text-3xl font-bold text-green-600">Normal</div>
            <p className="text-sm text-gray-500 mt-1">Last checked 5 mins ago</p>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { time: '2 hours ago', event: 'Blood pressure reading recorded' },
              { time: '4 hours ago', event: 'ECG analysis completed' },
              { time: '6 hours ago', event: 'Heart rate alert - elevated' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-red-600" />
                <div>
                  <p className="text-sm text-gray-600">{activity.event}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
