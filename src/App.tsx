import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DeckPage } from "@/pages/DeckPage";

function MissingEnvBanner() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) return null;
  return (
    <div className="border-b border-[#E36A6A]/35 bg-[#3B2222] px-4 py-2 text-center text-sm text-[#FFD7D7]">
      Add <code className="rounded bg-black/10 px-1">VITE_SUPABASE_URL</code> and{" "}
      <code className="rounded bg-black/10 px-1">VITE_SUPABASE_ANON_KEY</code>{" "}
      to <code className="rounded bg-black/10 px-1">.env</code> for auth and data.
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MissingEnvBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/deck/:deckId" element={<DeckPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
