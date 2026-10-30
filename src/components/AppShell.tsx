import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Check,
  ClipboardList,
  FileText,
  FolderHeart,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Pill,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { languages, translator } from "@/lib/i18n";
import { useT } from "@/lib/useT";
import type { Language } from "@/lib/types";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/prescriptions", key: "prescriptions", icon: ClipboardList },
  { to: "/scan", key: "scan", icon: ScanLine },
  { to: "/medications", key: "medications", icon: Pill },
  { to: "/verify", key: "verify", icon: ShieldCheck },
  { to: "/interactions", key: "interactions", icon: AlertTriangle },
  { to: "/reminders", key: "reminders", icon: Bell },
  { to: "/records", key: "records", icon: FolderHeart },
  { to: "/history", key: "history", icon: History },
  { to: "/simplifier", key: "simplifier", icon: FileText },
  { to: "/assistant", key: "assistant", icon: Bot },
  { to: "/voice", key: "voice", icon: Mic },
  { to: "/reports", key: "reports", icon: BarChart3 },
  { to: "/settings", key: "settings", icon: Settings },
] as const;

function Logo({ compact }: { compact?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Activity className="size-5" />
      </div>
      {!compact ? (
        <div className="leading-tight">
          <p className="font-display text-sm font-bold text-sidebar-foreground">MediAssist AI</p>
          <p className="text-[11px] text-sidebar-foreground/60">{t("Clinical Medication Assistant")}</p>
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { language, doses, notifications } = useStore();
  const t = translator(language);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pending = doses.filter((d) => d.status === "pending").length;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between px-4 py-4">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => {
          const active = pathname === item.to;
          const count = item.key === "reminders" ? pending : item.key === "dashboard" ? unread : 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4.5 shrink-0" />
              <span className="truncate">{t(item.key)}</span>
              {count > 0 ? (
                <span className="ml-auto rounded-full bg-warning px-1.5 text-[11px] font-bold text-warning-foreground">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-[11px] leading-relaxed text-sidebar-foreground/60">
          {t("Making Medication Safer, Smarter & Simpler with AI.")}
        </p>
      </div>
    </div>
  );
}

function NotificationBell() {
  const { notifications, markNotificationRead, markAllRead } = useStore();
  const unread = notifications.filter((n) => !n.read).length;
  const t = useT();
  const icon = {
    reminder: <Bell className="size-4 text-info" />,
    success: <Check className="size-4 text-success" />,
    warning: <AlertTriangle className="size-4 text-warning" />,
    info: <Sparkles className="size-4 text-info" />,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("Notifications")}>
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-90 max-w-[92vw]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">{t("Notifications")}</DropdownMenuLabel>
          <button
            className="text-xs font-semibold text-accent hover:underline"
            onClick={() => {
              markAllRead();
              toast.success(t("All notifications marked as read."));
            }}
          >
            {t("Mark all as read")}
          </button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onSelect={(e) => {
                e.preventDefault();
                markNotificationRead(n.id);
              }}
              className={cn("items-start gap-2.5 py-2.5", !n.read && "bg-info/5")}
            >
              <span className="mt-0.5">{icon[n.kind]}</span>
              <span className="flex-1">
                <span className="block text-sm leading-snug whitespace-normal">{n.message}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{n.time}</span>
              </span>
              {!n.read ? <span className="mt-1.5 size-2 rounded-full bg-accent" /> : null}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { user, language, setLanguage, logout } = useStore();
  const t = translator(language);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card/85 px-4 py-3 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label={t("Open menu")}>
        <Menu className="size-5" />
      </Button>
      <form
        className="relative hidden flex-1 max-w-md sm:block"
        onSubmit={(e) => {
          e.preventDefault();
          if (!query.trim()) return;
          navigate({ to: "/medications" });
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          className="pl-9"
        />
      </form>
      <div className="ml-auto flex items-center gap-1.5">
        <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
          <SelectTrigger className="w-28 sm:w-34" aria-label={t("language")}>
            <Globe className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.native}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("voice")}
          onClick={() => navigate({ to: "/voice" })}
        >
          <Mic className="size-4.5" />
        </Button>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <span className="flex size-8 items-center justify-center rounded-full gradient-brand text-xs font-bold text-primary-foreground">
                {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U"}
              </span>
              <span className="hidden text-left text-xs leading-tight sm:block">
                <span className="block font-semibold">{user.name}</span>
                <span className="block text-muted-foreground">{user.email}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
              <User className="size-4" /> {t("profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
              <Settings className="size-4" /> {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                logout();
                navigate({ to: "/" });
                toast.success(t("You have been logged out."));
              }}
            >
              <LogOut className="size-4" /> {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useT();
  const items = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/scan", label: "Scan", icon: ScanLine },
    { to: "/verify", label: "Verify", icon: ShieldCheck },
    { to: "/reminders", label: "Doses", icon: Bell },
    { to: "/assistant", label: "AI", icon: Bot },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur sm:hidden">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
            pathname === i.to ? "text-accent" : "text-muted-foreground",
          )}
        >
          <i.icon className="size-5" />
          {t(i.label)}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-70 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarNav />
        </div>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="hidden" />
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">{t("Navigation")}</SheetTitle>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setOpen(true)} />
        <main id="main" className="flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-10 lg:px-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}

