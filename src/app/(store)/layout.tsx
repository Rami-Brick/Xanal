import { Geist, Geist_Mono } from "next/font/google";
import { StoreSidebar } from "@/components/nav/StoreSidebar";
import { SidebarShell } from "@/components/nav/SidebarShell";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${geist.variable} ${geistMono.variable}`}
      style={{
        minHeight: "100vh",
        backgroundColor: "#0e0e0e",
        fontFamily: "var(--font-geist), system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        color: "#fff",
      }}
    >
      <SidebarShell>
        <StoreSidebar />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: "100vh",
          }}
        >
          {children}
        </main>
      </SidebarShell>
    </div>
  );
}
