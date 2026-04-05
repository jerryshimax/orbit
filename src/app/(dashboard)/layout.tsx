import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg">
            Orbit
          </Link>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <Link
              href="/"
              className="hover:text-white transition-colors"
            >
              Pipeline
            </Link>
            <Link
              href="/contacts"
              className="hover:text-white transition-colors"
            >
              Contacts
            </Link>
            <Link
              href="/activity"
              className="hover:text-white transition-colors"
            >
              Activity
            </Link>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          Current Equities Fund I
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
