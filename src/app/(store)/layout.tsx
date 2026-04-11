import { Geist, Geist_Mono } from "next/font/google";

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
      {children}
    </div>
  );
}
