import { AppNav } from "@/components/nav/AppNav";
import { BackgroundSync } from "@/components/sync/BackgroundSync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f6f6f6",
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.11) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <AppNav />
      <BackgroundSync />
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px 64px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
