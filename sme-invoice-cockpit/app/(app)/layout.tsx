"use client";
import { Sidebar } from "@/app/components/Sidebar";
import { RequireAuth } from "@/app/components/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </RequireAuth>
  );
}
