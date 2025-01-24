import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";

export default async function DashboardPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-red-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Patient Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Heart Rate"
            value="72 BPM"
            icon="❤️"
          />
          <DashboardCard
            title="Blood Pressure"
            value="120/80"
            icon="🩺"
          />
          <DashboardCard
            title="Next Appointment"
            value="Jan 30, 2025"
            icon="📅"
          />
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-red-600">{value}</p>
    </div>
  );
}
