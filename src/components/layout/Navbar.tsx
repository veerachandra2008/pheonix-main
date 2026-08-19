import { Navbar as AppNavbar } from '@/components/Navbar';

export const Navbar = (_props: { isLoggedIn?: boolean; user?: unknown }) => {
  return <AppNavbar />;
};
