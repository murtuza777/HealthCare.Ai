import { Link } from "react-router";
import { Shell } from "../components/Shell";

export function NotFound() {
  return (
    <Shell>
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Link to="/" className="font-semibold text-action hover:underline">
          Go home
        </Link>
      </main>
    </Shell>
  );
}
