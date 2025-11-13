import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" className={dmSans.variable}>
        <body className="bg-neutral-950 text-white font-sans antialiased">
        <Header />
        <main>{children}</main>
        <BottomNav />
        </body>
        </html>
    );
}
