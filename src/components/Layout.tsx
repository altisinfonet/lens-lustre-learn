import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";

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
      <Outlet />
    </>
  );
};

export default Layout;
