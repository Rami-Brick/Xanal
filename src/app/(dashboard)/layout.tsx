import { AppNav } from "@/components/nav/AppNav";

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
      <main
        className="dashboard-main"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px 64px",
        }}
      >
        <style>{`
          @media (max-width: 767px) {
            .dashboard-main {
              padding-top: 112px !important;
              padding-left: 16px !important;
              padding-right: 16px !important;
            }
          }
        `}</style>
        {children}
      </main>
    </div>
  );
}
