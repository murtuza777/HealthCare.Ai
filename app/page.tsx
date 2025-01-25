import HomeClient from '@/app/components/HomeClient';

export default function Home() {
  return (
    <HomeClient>
      <>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Welcome to Healthcare.AI
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Your comprehensive health monitoring and management platform powered by artificial intelligence.
        </p>
        <div className="mt-10">
          <a
            href="/login"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Start Monitoring Your Health
          </a>
        </div>
      </>
    </HomeClient>
  );
}