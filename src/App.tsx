import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import Index from "./pages/Index";
import TeamDetail from "./pages/TeamDetail";
import Leagues from "./pages/Leagues";
import MatchLineup from "./pages/MatchLineup";
import MatchResults from "./pages/MatchResults";
import MatchVotes from "./pages/MatchVotes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthGuard>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/teams/:teamId" element={<TeamDetail />} />
            <Route path="/match/:matchId/lineup" element={<MatchLineup />} />
            <Route path="/match/:matchId/results" element={<MatchResults />} />
            <Route path="/match/:matchId/votes" element={<MatchVotes />} />
            <Route path="/leagues" element={<Leagues />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
