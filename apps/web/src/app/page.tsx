import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <section className="flex flex-col items-center justify-center text-center py-24">
      <h1 className="text-4xl md:text-6xl font-bold text-indigo-400 mb-6">
        Welcome to Anthé Labs
      </h1>
      <p className="max-w-xl text-zinc-400 mb-8">
        A next-gen copytrading platform empowering creators and traders with
        data-driven insights.
      </p>
      
      {error && (
        <div className="max-w-xl mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          <p className="font-semibold mb-1">Authentication Error</p>
          <p className="text-sm">{decodeURIComponent(error)}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg"
        >
          Launch App
        </Link>
        <Link
          href="/about"
          className="border border-zinc-700 hover:bg-zinc-800 text-zinc-200 px-6 py-3 rounded-lg"
        >
          Learn More
        </Link>
      </div>
    </section>
  );
}
