<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- All money math lives in `src/lib/engine.ts` as integer cents and is recomputed from scratch (`computeAll`); UI never mutates balances directly, so cascades stay consistent.
- App state lives in `src/lib/store.ts` (localStorage, guest mode); cloud sync will plug in later without changing the engine.
- Loans and credit lines are derived per month by `computeCredit` in engine.ts from the movements themselves (installments/draws/payments are ordinary Tx rows linked by loanId/lineId), so the cash flow never holds duplicate payments.
- Loan math (rate solved from total/installment, or implied by the payoff amount) lives in `loanTerms` in engine.ts; a loan's `direction` decides whether its installments are expenses (payable) or income (receivable), so receivables never count as my debt.
- Credit cards (`cardMonth`), yearly tag totals and backup validation are pure functions in engine.ts; card payments are ordinary Tx rows linked by cardId, and every store action appends to `history` via `log()`.
- Deployment modes are isolated: Pages emits a client-only shell with repository-relative assets and the default retains Lovable hosting; one target must not change another's runtime.
- Pages routing uses Vite BASE_URL, and prepare-pages emits a document for every concrete content route so GitHub Pages can serve direct links without a 404 fallback.
- Firebase is the only backend (browser auth + backups); there is no separate server target because all logic runs in the browser.
- Logout awaits Firebase sign-out before clearing local identity; the store strips profile data from non-Google sessions on load and update so guest mode cannot inherit a previous account.
