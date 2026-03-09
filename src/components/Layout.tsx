import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GiftCelebrationModal from "@/components/GiftCelebrationModal";
import AnnouncementBar from "@/components/AnnouncementBar";
import AskAnything from "@/components/AskAnything";
import PageSEO from "@/components/PageSEO";
import FeedRightSidebar from "@/components/FeedRightSidebar";
import AdPlacement from "@/components/AdPlacement";
import { useAuth } from "@/hooks/useAuth";

/** Pages where the Navbar should NOT be shown (auth screens) */
const hideNavRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/admin"];

/** Pages where the right sidebar should NOT be shown */
const hideSidebarRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/admin"];

/** Pages where ads should NOT be shown */
const hideAdRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];

/** Home page gets a transparent overlay navbar */
const Layout = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hideNav = hideNavRoutes.includes(pathname);
  const isHome = pathname === "/";
  const showSidebar = user && !hideSidebarRoutes.includes(pathname) && !pathname.startsWith("/admin");
  const showAds = !hideAdRoutes.includes(pathname) && !pathname.startsWith("/admin");

  return (
    <>
      <PageSEO />
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

      {showAds && (
        <div className={`container mx-auto px-4 md:px-8 ${isHome ? "pt-24 md:pt-28" : "pt-3"}`}>
          <AdPlacement placement="header" />
        </div>
      )}

      <GiftCelebrationModal />

      {showSidebar ? (
        <div className="flex gap-8 container mx-auto px-4 md:px-8">
          <div className="flex-1 min-w-0">
            <Outlet />
            {showAds && (
              <div className="py-6">
                <AdPlacement placement="in-content" />
              </div>
            )}
          </div>
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24 self-start py-6">
            <FeedRightSidebar />
          </aside>
        </div>
      ) : (
        <>
          <Outlet />
          {showAds && (
            <div className="container mx-auto px-4 md:px-8 py-6">
              <AdPlacement placement="in-content" />
            </div>
          )}
        </>
      )}

      {showAds && (
        <div className="container mx-auto px-4 md:px-8 pb-6">
          <AdPlacement placement="footer" />
        </div>
      )}

      {!hideNav && <AskAnything />}
    </>
  );
};

export default Layout;
