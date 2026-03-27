import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Titlebar } from "./Titlebar";
import { Toaster } from "@/components/ui/toaster";

export function AppLayout({ onCikis }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden" style={{ marginTop: 40 }}>
        <Sidebar onCikis={onCikis} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
