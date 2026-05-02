import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SignupForm } from "@/components/auth/SignupForm";
import { Skeleton } from "@/components/ui/skeleton";

export function SignupPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Skeleton className="h-[400px] w-full max-w-md rounded-xl" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <SignupForm />
    </div>
  );
}
