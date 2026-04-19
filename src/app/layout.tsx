import "./globals.css";

export const metadata = {
  title: "Jarvis AI",
  description: "Jarvis Web Interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
