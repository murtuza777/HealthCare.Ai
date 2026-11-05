import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient, useSession } from "../lib/auth-client";
import { Shell } from "../components/Shell";

/** Authenticated area. The API enforces access too; this only handles navigation. */
export function AppLayout() {
  const { data: session, isPending } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (isPending) {
    return (
      <Shell>
        <p className="p-8 text-gray-400">Loading…</p>
      </Shell>
    );
  }
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;

  async function signOut() {
    await authClient.signOut();
    queryClient.clear(); // drop cached health data
    navigate("/", { replace: true });
  }

  return (
    <Shell>
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/app" className="text-lg font-bold">
            Healthcare<span className="text-red-500">.AI</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-gray-400 sm:inline">{session.user.email}</span>
            <button onClick={signOut} className="text-gray-300 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </Shell>
  );
}
