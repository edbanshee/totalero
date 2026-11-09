import { Info, Languages, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { setState, useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tlg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="oklch(0.5 0.17 255)" />
        </linearGradient>
      </defs>
      <path d="M6 8h30v8H25v26h-8V16H6z" fill="url(#tlg)" />
      <path d="M8 26c0 18 10 30 24 30s24-12 26-34l5 3-2-14-12 7 5 2c-2 17-10 28-22 28S14 44 14 26z" fill="url(#tlg)" />
      <rect x="30" y="30" width="6" height="14" rx="1" fill="var(--positive)" />
      <rect x="40" y="22" width="6" height="18" rx="1" fill="var(--positive)" />
    </svg>
  );
}

export function TopIcons() {
  const { lang, theme } = useApp();
  const t = useT();
  const btn = "grid h-8 w-8 place-items-center rounded-md text-primary transition hover:bg-accent";
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Info" className={btn} onClick={() => toast(t.info)}>
        <Info className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <button
        aria-label="Language"
        className={btn}
        onClick={() => setState(() => ({ lang: lang === "es" ? "en" : "es" }))}
      >
        <Languages className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <button
        aria-label="Theme"
        className={btn}
        onClick={() => setState(() => ({ theme: theme === "dark" ? "light" : "dark" }))}
      >
        {theme === "dark" ? <Sun className="h-5 w-5" strokeWidth={2.5} /> : <Moon className="h-5 w-5 fill-current" />}
      </button>
    </div>
  );
}

export function GoogleG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}
