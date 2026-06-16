import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";
import ArtistPage from "./pages/ArtistPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import ProfilePage from './pages/ProfilePage.tsx';
import EditProfilePage from './pages/EditProfilePage.tsx';
import CommunityPage from './pages/CommunityPage.tsx';
import PublicProfilePage from "./pages/PublicProfilePage.tsx";
import MessagesPage from "./pages/MessagesPage.tsx";
import AdminPage from './pages/AdminPage.tsx';

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
            <Route path="/artist/:slug" element={<ArtistPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} /> {/* Το δικό μου προφίλ */}
            <Route path="/user/:userId" element={<PublicProfilePage />} /> {/* Προφίλ άλλων χρηστών */}
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </AuthProvider>  
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;