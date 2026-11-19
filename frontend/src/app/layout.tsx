import type { Metadata } from "next";
import "../styles/globals.css";
import { EnvironmentBanner } from "@/components/layout/EnvironmentBanner";
import { TopNav } from "@/components/layout/TopNav";
import { AuthGuard } from "@/components/layout/AuthGuard";

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
      <body className="bg-[#FAF8F5] dark:bg-[#0C0A09] text-[#1C1917] dark:text-[#F5F5F4] min-h-screen flex flex-col font-sans antialiased selection:bg-[#0F766E]/20 selection:text-[#0F766E] dark:selection:bg-[#14B8A6]/20 dark:selection:text-[#14B8A6]">
        {/* Environment status banner */}
        <EnvironmentBanner />

        {/* Sleek Top Navigation Bar with Centered Pill Dock */}
        <TopNav />

        {/* Main Content Area with Session Auth Guard */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AuthGuard>
            {children}
          </AuthGuard>
        </main>
      </body>
    </html>
  );
}
