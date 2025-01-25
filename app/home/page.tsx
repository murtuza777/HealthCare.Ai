'use client';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-red-600">Welcome to Dashboard</h1>
      <p className="mt-4 text-gray-600">This is a test page</p>
      <button
        onClick={() => window.location.href = '/'}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Go Back
      </button>
    </div>
  );
}
