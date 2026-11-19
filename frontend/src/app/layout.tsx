import type { Metadata } from "next";
import "../styles/globals.css";
import { EnvironmentBanner } from "@/components/layout/EnvironmentBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export const metadata: Metadata = {
  title: "AutoPatch | Autonomous Bug Detection & Repair",
  description: "Autonomous software bug detection, repair, and verification system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0C0A09] text-[#F5F5F4] min-h-screen flex flex-col font-sans antialiased">
        {/* Environment status banner */}
        <EnvironmentBanner />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            <TopNav />
            <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
