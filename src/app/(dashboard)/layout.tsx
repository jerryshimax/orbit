import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";
import { CommandPalette } from "@/components/shared/command-palette";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 md:ml-[220px] flex flex-col">
        <div className="hidden md:block">
          <Topbar />
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
