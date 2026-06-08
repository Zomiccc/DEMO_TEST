import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tandoor — Order Food Online',
  description: 'Fresh food delivered fast. Real-time tracking, loyalty points, and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
