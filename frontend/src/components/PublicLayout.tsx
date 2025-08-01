import { Footer } from "@/components/Footer";

export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* You can add a public header here if you want */}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
