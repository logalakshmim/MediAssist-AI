import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const { ready, loggedIn } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !loggedIn) navigate({ to: "/" });
  }, [ready, loggedIn, navigate]);

  if (!ready || !loggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-accent" />
      </div>
    );
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
