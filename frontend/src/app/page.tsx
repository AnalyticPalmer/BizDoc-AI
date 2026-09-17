import ApiStatus from "@/components/api-status";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#E4E7EC] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-[#3157F6]">
          BizDoctor AI
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#101828]">
          System connection test
        </h1>

        <p className="mt-3 leading-7 text-[#667085]">
          We are confirming that the Next.js application can communicate
          successfully with the FastAPI backend.
        </p>

        <div className="mt-6">
          <ApiStatus />
        </div>
      </div>
    </main>
  );
}