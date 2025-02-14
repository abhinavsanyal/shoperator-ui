import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import DashboardLayout from "./components/DashboardLayout";
import NewSessionPage from "./pages/NewSessionPage";
import SessionPage from "./pages/SessionPage";
import LandingPage from "./pages/LandingPage";
import { AgentSettingsProvider } from "./contexts/AgentSettingsContext";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AgentSettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/" element={<DashboardLayout />}>
              <Route path="new-session" element={<NewSessionPage />} />
              <Route path="session/:runId" element={<SessionPage />} />
              <Route index element={<Navigate to="/new-session" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AgentSettingsProvider>
    </ClerkProvider>
  );
}

export default App;
