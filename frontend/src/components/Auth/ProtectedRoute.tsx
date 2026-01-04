import { Navigate } from "react-router-dom";
import { useSessionStore } from "../../store/sessionStore";
import { toast } from "../../utils/toast";
import { useEffect, useRef } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { hasValidSession } = useSessionStore();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!hasValidSession() && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.warning({
        title: "Configuration Required",
        message:
          "Please configure your X/Twitter API keys before using this feature.",
      });
    }
  }, [hasValidSession]);

  if (!hasValidSession()) {
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
}
