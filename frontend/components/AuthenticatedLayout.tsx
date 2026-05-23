'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { BottomSheetProvider } from '@/lib/BottomSheetContext';

const NO_NAV_PATHS = ['/onboarding', '/auth/reset'];
const MAIN_NAV_PAGES = ['/feed', '/explore', '/add', '/me'];

type Props = {
  children: React.ReactNode;
};

/**
 * Gère l'affichage du layout selon l'état d'authentification.
 * Toutes les pages sont accessibles — chaque page gère son propre état auth.
 */
export default function AuthenticatedLayout({ children }: Props) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const hideNav = NO_NAV_PATHS.some(path => pathname.startsWith(path));
  const showBottomNav = !loading && MAIN_NAV_PAGES.includes(pathname);

  return (
    <BottomSheetProvider>
      {!loading && user && !hideNav && <Header />}
      <main>{children}</main>
      {showBottomNav && <BottomNav />}
    </BottomSheetProvider>
  );
}

