import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import EditProfile from "./pages/EditProfile";
import Profile from "./pages/Profile";
import Competitions from "./pages/Competitions";
import CompetitionDetail from "./pages/CompetitionDetail";
import CompetitionSubmit from "./pages/CompetitionSubmit";
import AdminPanel from "./pages/AdminPanel";
import Journal from "./pages/Journal";
import JournalArticle from "./pages/JournalArticle";
import JournalEditor from "./pages/JournalEditor";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CourseEditor from "./pages/CourseEditor";
import LessonView from "./pages/LessonView";
import Certificates from "./pages/Certificates";
import VerifyCertificate from "./pages/VerifyCertificate";
import Winners from "./pages/Winners";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/competitions" element={<Competitions />} />
            <Route path="/competitions/:id" element={<CompetitionDetail />} />
            <Route path="/competitions/:id/submit" element={<CompetitionSubmit />} />
            <Route path="/admin" element={<AdminPanel />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
