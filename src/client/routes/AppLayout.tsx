import { useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Siren } from "lucide-react";
import { authClient, useSession } from "../lib/auth-client";
import { useProfile } from "../lib/queries";
import { EmergencyDialog } from "../components/EmergencyDialog";

// Ported from legacy/app/dashboard/page.tsx: same header, pill navigation and glass styling,
// but each tab is a real route (shareable URLs, back button works).

const NAV = [
  { to: "/app", label: "Overview", end: true },
  { to: "/app/vitals", label: "Vitals" },
  { to: "/app/medications", label: "Medications" },
  { to: "/app/symptoms", label: "Symptoms" },
  { to: "/app/reports", label: "Reports" },
  { to: "/app/profile", label: "Profile" },
];

export function AppLayout() {
  const { data: session, isPending } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  if (isPending) {
    return (
      <Background>
        <p className="p-8 text-gray-400">Loading…</p>
      </Background>
    );
  }
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;

  async function signOut() {
    await authClient.signOut();
    queryClient.clear(); // drop cached health data
    navigate("/", { replace: true });
  }

  return (
    <Background>
      <header className="sticky top-0 z-40 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/app" className="text-xl font-bold text-white">
            Healthcare<span className="text-red-600">.AI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Welcome fallback={session.user.email} />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEmergencyOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 font-medium text-white shadow-md"
            >
              <Siren className="h-4 w-4" aria-hidden="true" /> Emergency
            </motion.button>
            <button onClick={signOut} className="px-2 py-2 text-gray-200 transition-colors hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Sections" className="overflow-x-auto rounded-full bg-black/20 p-1 backdrop-blur-md">
          <ul className="flex min-w-max justify-center gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${isActive ? "text-white" : "text-gray-300 hover:text-white"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="tabIndicator" className="absolute inset-0 -z-10 rounded-full bg-red-600" />
                      )}
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <EmergencyDialog open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </Background>
  );
}

function Welcome({ fallback }: { fallback: string }) {
  const { data: profile } = useProfile();
  const name = profile?.name?.trim() || fallback.split("@")[0];
  return <span className="hidden text-gray-100 md:inline">Welcome, {name}</span>;
}

/** Ported from the legacy HealthAnimatedBackground: dark gradient with a slow ECG trace. */
function Background({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-white">
      <div className="fixed inset-0 -z-20 bg-gradient-to-br from-black via-gray-900 to-blue-950" aria-hidden="true" />
      <svg
        className="fixed inset-0 -z-10 h-full w-full opacity-20"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <motion.path
          d="M0,540 L320,540 L340,400 L360,680 L380,400 L400,680 L420,540 L960,540 L980,440 L1000,640 L1020,540 L1920,540"
          fill="none"
          stroke="#ff3333"
          strokeWidth="4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </svg>
      {children}
    </div>
  );
}
