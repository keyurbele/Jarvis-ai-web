import "./globals.css";

export const metadata = {
  title: "Jarvis AI",
  description: "My personal AI assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        {/* This "children" part is where your orb and button from page.tsx live */}
        {children}
      </body>
    </html>
  );
}
