import FileUploader from "../components/FileUploader";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="space-y-6 text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          🥭 Mango Cloud Portal
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
          Distributed Object Node Entrypoint. Powered by Next.js, Dockerized Node, MongoDB Ledger, and MinIO Engine.
        </p>
      </div>

      <FileUploader />
    </main>
  );
}