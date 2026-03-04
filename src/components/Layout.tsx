import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GiftCelebrationModal from "@/components/GiftCelebrationModal";
import AnnouncementBar from "@/components/AnnouncementBar";
import AskAnything from "@/components/AskAnything";

/** Pages where the Navbar should NOT be shown (auth screens) */
const hideNavRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/admin"];

/** Home page gets a transparent overlay navbar */
const Layout = () => {
  const { pathname } = useLocation();
  const hideNav = hideNavRoutes.includes(pathname);
  const isHome = pathname === "/";

  return (
    <>
      {!hideNav && isHome && (
        /* Home page: announcement + navbar float above hero as a single absolute group */
        <div className="absolute top-0 left-0 right-0 z-50">
          <AnnouncementBar />
          <Navbar transparent />
        </div>
      )}
      {!hideNav && !isHome && (
        <>
          <AnnouncementBar />
          <Navbar />
        </>
      )}
      <GiftCelebrationModal />
      <Outlet />
      {!hideNav && <AskAnything />}
    </>
  );
};

export default Layout;
