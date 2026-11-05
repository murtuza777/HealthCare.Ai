import { Link } from "react-router";
import { Shell } from "../components/Shell";

export function NotFound() {
  return (
    <Shell>
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Link to="/" className="text-red-400 hover:text-red-300">
          Go home
        </Link>
      </main>
    </Shell>
  );
}
