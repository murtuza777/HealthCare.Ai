import { useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, FileText, LayoutGrid, LogOut, Pill, Stethoscope, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { authClient, useSession } from "../lib/auth-client";
import { useProfile } from "../lib/queries";
import { EmergencyDialog } from "../components/EmergencyDialog";
import { HeartMark } from "../components/Shell";
import { Loading } from "../components/ui";

// Operate surface. A quiet top bar with text tabs on wide screens; a bottom tab bar on phones.
// Emergency is one tap away everywhere: an outlined red pill, the only red control.

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
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
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
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-ground/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-8 px-5 sm:px-8">
          <Link to="/app" className="inline-flex items-center gap-2 rounded-md text-ink" aria-label="Healthcare.AI, overview">
            <HeartMark />
            <span className="hidden font-serif text-[1.3125rem] leading-none tracking-[-0.02em] sm:inline">Healthcare.AI</span>
          </Link>

          <nav aria-label="Sections" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex h-9 items-center rounded-full px-3.5 text-[0.9375rem] transition-colors duration-150 ${
                        isActive ? "bg-ink/[0.06] font-[560] text-ink" : "font-[460] text-ink-muted hover:text-ink"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setEmergencyOpen(true)}
              className="mr-1 inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-danger/30 px-3.5 text-[0.9375rem] font-[560] text-danger transition-[background-color,border-color,transform] duration-150 ease-out hover:border-danger hover:bg-danger-soft active:scale-[0.97]"
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-danger" /> Emergency
            </button>
            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[0.9375rem] transition-colors duration-150 ${isActive ? "bg-ink/[0.06] font-[560] text-ink" : "text-ink-muted hover:text-ink"}`
              }
            >
              <UserRound className="h-[1.125rem] w-[1.125rem] lg:hidden" aria-hidden="true" />
              <span className="hidden lg:inline">
                <AccountName fallback={session.user.email} />
              </span>
              <span className="sr-only lg:hidden">Profile</span>
            </NavLink>
            <button onClick={signOut} className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[0.9375rem] text-ink-muted transition-colors duration-150 hover:text-ink">
              <LogOut className="h-[1.125rem] w-[1.125rem] sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div key={location.pathname} className="settle">
          <Outlet />
        </div>
      </main>

      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ground/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, short, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors ${isActive ? "font-[600] text-ink" : "text-ink-faint"}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-[1.375rem] w-[1.375rem]" strokeWidth={isActive ? 2 : 1.6} aria-hidden="true" />
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
