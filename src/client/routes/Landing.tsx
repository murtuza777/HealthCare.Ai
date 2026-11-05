import { Link } from "react-router";
import { Shell } from "../components/Shell";

// Placeholder. The full landing page is ported from legacy/app/page.tsx in the UI-porting step.
export function Landing() {
  return (
    <Shell>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Healthcare<span className="text-red-500">.AI</span>
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Track your heart health, never miss a dose, share reports with your doctor, and keep the people who care
          for you in the loop.
        </p>
        <Link to="/login" className="mt-8 rounded-lg bg-red-600 px-6 py-3 font-medium hover:bg-red-500">
          Get started
        </Link>
      </main>
    </Shell>
  );
}
