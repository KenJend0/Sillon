import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr">
        <body className="bg-neutral-950 text-white">
        <Header />
        <main>{children}</main>
        <BottomNav />
        </body>
        </html>
    );
}
