import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "bazario-install-dismissed";

/**
 * Lightweight "Add to Home Screen" banner for the installable PWA build.
 * No-ops automatically inside the native Capacitor Android shell, since
 * `beforeinstallprompt` never fires there.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card shadow-lg p-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install Bazario</p>
          <p className="text-xs text-muted-foreground truncate">Add to your home screen for the full app experience</p>
        </div>
        <Button size="sm" onClick={install}>Install</Button>
        <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
