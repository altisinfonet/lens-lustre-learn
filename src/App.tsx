import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { LanguageProvider } from "@/hooks/useLanguage";
import { lazy, Suspense } from "react";
import Layout from "@/components/Layout";

/* Eagerly load the homepage */
import Index from "./pages/Index";

/* Lazy-load all other pages for faster initial load */
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Profile = lazy(() => import("./pages/Profile"));
const Competitions = lazy(() => import("./pages/Competitions"));
const CompetitionDetail = lazy(() => import("./pages/CompetitionDetail"));
const CompetitionSubmit = lazy(() => import("./pages/CompetitionSubmit"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Journal = lazy(() => import("./pages/Journal"));
const JournalArticle = lazy(() => import("./pages/JournalArticle"));
const JournalEditor = lazy(() => import("./pages/JournalEditor"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CourseEditor = lazy(() => import("./pages/CourseEditor"));
const LessonView = lazy(() => import("./pages/LessonView"));
const Certificates = lazy(() => import("./pages/Certificates"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const Winners = lazy(() => import("./pages/Winners"));
const JudgePanel = lazy(() => import("./pages/JudgePanel"));
const Wallet = lazy(() => import("./pages/Wallet"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Friends = lazy(() => import("./pages/Friends"));
const Feed = lazy(() => import("./pages/Feed"));
const Discover = lazy(() => import("./pages/Discover"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FeaturedArtistPage = lazy(() => import("./pages/FeaturedArtistPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <span
      className="text-xs tracking-[0.3em] uppercase text-muted-foreground animate-pulse"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      Loading…
    </span>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
          <LanguageProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<PublicProfile />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/competitions" element={<Competitions />} />
                <Route path="/competitions/:id" element={<CompetitionDetail />} />
                <Route path="/competitions/:id/submit" element={<CompetitionSubmit />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/judge" element={<JudgePanel />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/journal/new" element={<JournalEditor />} />
                <Route path="/journal/edit/:id" element={<JournalEditor />} />
                <Route path="/journal/:slug" element={<JournalArticle />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/new" element={<CourseEditor />} />
                <Route path="/courses/edit/:id" element={<CourseEditor />} />
                <Route path="/courses/:slug" element={<CourseDetail />} />
                <Route path="/courses/:slug/lessons/:lessonId" element={<LessonView />} />
                <Route path="/certificates" element={<Certificates />} />
                <Route path="/verify" element={<VerifyCertificate />} />
                <Route path="/winners" element={<Winners />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/featured-artist/:slug" element={<FeaturedArtistPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
          </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
