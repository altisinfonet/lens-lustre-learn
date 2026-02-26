import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GiftCelebrationModal from "@/components/GiftCelebrationModal";

/** Pages where the Navbar should NOT be shown (auth screens) */
const hideNavRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];

/** Home page gets a transparent overlay navbar */
const Layout = () => {
  const { pathname } = useLocation();
  const hideNav = hideNavRoutes.includes(pathname);
  const isHome = pathname === "/";

  return (
    <>
      {!hideNav && <Navbar transparent={isHome} />}
      <GiftCelebrationModal />
      <Outlet />
    </>
  );
};

export default Layout;
