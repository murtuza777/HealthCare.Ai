'use client';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-red-600">HeartCare.AI</span>
            </div>
            <a
              href="/"
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Heart Rate</h3>
            <div className="text-3xl font-bold text-red-600">72 BPM</div>
            <p className="text-sm text-green-600 mt-1">Normal Range</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Blood Pressure</h3>
            <div className="text-3xl font-bold text-red-600">120/80</div>
            <p className="text-sm text-green-600 mt-1">Optimal</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Oxygen Level</h3>
            <div className="text-3xl font-bold text-red-600">98%</div>
            <p className="text-sm text-green-600 mt-1">Normal Range</p>
          </div>
        </div>
      </main>
    </div>
  );
}
