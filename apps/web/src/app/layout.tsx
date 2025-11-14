import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Anthé Labs — Copy Trading Platform on Aptos",
  description:
    "Mirror top traders & automated bots. Secure copy trading on Aptos — start in minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#060913]">
      <body className="min-h-screen flex flex-col bg-[#060913] text-slate-100 antialiased">
        {/* Full background that extends behind navbar */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {/* Base gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#060913] via-[#0a0d17] to-[#060913]" />

          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <Navbar />
        <main className="flex-1 relative z-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
