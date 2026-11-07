import { useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, FileText, LayoutGrid, LogOut, Pill, Siren, Stethoscope, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { authClient, useSession } from "../lib/auth-client";
import { useProfile } from "../lib/queries";
import { EmergencyDialog } from "../components/EmergencyDialog";
import { HeartMark } from "../components/Shell";
import { Loading } from "../components/ui";

// Operate surface. Top bar with tabs on wide screens; a bottom tab bar on phones (the pattern
// patients already know). Emergency is one tap away everywhere and is the only red control.

const NAV: { to: string; label: string; short: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/app", label: "Overview", short: "Overview", icon: LayoutGrid, end: true },
  { to: "/app/vitals", label: "Readings", short: "Readings", icon: Activity },
  { to: "/app/medications", label: "Medicines", short: "Medicines", icon: Pill },
  { to: "/app/symptoms", label: "Symptoms", short: "Symptoms", icon: Stethoscope },
  { to: "/app/reports", label: "Reports", short: "Reports", icon: FileText },
];

export function AppLayout() {
  const { data: session, isPending } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Loading label="Opening your record" />
      </div>
    );
  }
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;

  async function signOut() {
    await authClient.signOut();
    queryClient.clear(); // drop cached health data
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-ground pb-24 md:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-sheet focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-sheet/95 backdrop-blur supports-[backdrop-filter]:bg-sheet/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/app" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
            <HeartMark />
            <span className="hidden sm:inline">Healthcare.AI</span>
          </Link>

          <nav aria-label="Sections" className="hidden h-full md:flex">
            <ul className="flex h-full">
              {NAV.map((item) => (
                <li key={item.to} className="h-full">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `relative flex h-full items-center px-3 font-semibold transition-colors ${
                        isActive
                          ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-action"
                          : "text-ink-muted hover:text-ink"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setEmergencyOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-control bg-danger px-3.5 font-semibold text-white transition-colors hover:bg-danger-hover"
            >
              <Siren className="h-4 w-4" aria-hidden="true" /> Emergency
            </button>
            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-control px-2.5 font-semibold transition-colors ${isActive ? "bg-action-soft text-ink" : "text-ink-muted hover:bg-well hover:text-ink"}`
              }
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
              <span className="hidden lg:inline">
                <AccountName fallback={session.user.email} />
              </span>
              <span className="sr-only lg:hidden">Profile</span>
            </NavLink>
            <button onClick={signOut} className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-control px-2.5 font-semibold text-ink-muted transition-colors hover:bg-well hover:text-ink">
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-sheet pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, short, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${isActive ? "text-action" : "text-ink-muted"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 1.9} aria-hidden="true" />
                    {short}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <EmergencyDialog open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </div>
  );
}

function AccountName({ fallback }: { fallback: string }) {
  const { data: profile } = useProfile();
  return <>{profile?.name?.trim() || fallback.split("@")[0]}</>;
}
