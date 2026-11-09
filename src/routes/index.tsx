import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Briefcase, CreditCard, Droplet, LogIn, ShieldCheck, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { GoogleG, Logo, TopIcons } from "@/components/totalero/common";
import { Num } from "@/components/totalero/Num";
import { useT } from "@/lib/i18n";
import { setState } from "@/lib/store";
import { firebaseConfigured, signInWithGoogle } from "@/lib/firebase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Totalero — Tu espacio financiero proyectado" },
      { name: "description", content: "Controla tu liquidez y proyecta tu flujo de caja quincenal." },
      { property: "og:title", content: "Totalero — Tu espacio financiero proyectado" },
      { property: "og:description", content: "Controla tu liquidez y proyecta tu flujo de caja quincenal." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const t = useT();
  const nav = useNavigate();
  const feats = [
    { i: Briefcase, l: t.expenses, c: "text-positive" },
    { i: Droplet, l: t.liquidity, c: "text-primary" },
    { i: CreditCard, l: t.cards, c: "text-positive" },
    { i: BadgeDollarSign, l: t.loans, c: "text-primary" },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-card">
      <header className="flex justify-end p-6">
        <TopIcons />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md rounded-sm border bg-card px-8 py-14 text-center">
          <Logo className="mx-auto h-24 w-24" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{t.welcome}</h1>
          <p className="mt-4 text-sm font-medium text-positive">{t.tagline}</p>
          <div className="mt-6 flex justify-center divide-x">
            {feats.map(({ i: I, l, c }) => (
              <div key={l} className="flex flex-col items-center gap-1 px-4">
                <I className={`h-6 w-6 ${c}`} strokeWidth={2.5} />
                <span className="text-xs text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
          <button
            onClick={async () => {
              if (!firebaseConfigured) { toast(t.googleSoon); return; }
              try { await signInWithGoogle(); toast.success(t.signedIn); nav({ to: "/app" }); } catch { toast.error(t.cloudErr); }
            }}
            className="mt-10 flex h-10 w-full items-center justify-center gap-2.5 rounded-md bg-navy px-3 text-sm font-medium text-navy-foreground [font-family:'Google_Sans',Inter,sans-serif]"
          >
            <GoogleG />
            {t.google}
          </button>
          <div className="my-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            {t.or}
            <div className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={() => {
              setState(() => ({ session: "guest" }));
              nav({ to: "/app" });
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <LogIn className="h-4 w-4" />
            {t.guest}
          </button>
          <div className="mt-10 flex items-center gap-3 rounded-md bg-muted px-4 py-2 text-left text-[11px] font-light text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
            {t.privacy}
          </div>
        </div>
      </main>
      <footer className="border-t py-3 text-center text-[10px] text-muted-foreground"><Num>{t.footer}</Num></footer>
    </div>
  );
}
