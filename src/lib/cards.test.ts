import { beforeEach, describe, expect, it } from "vitest";
import { cardMonth } from "./engine";
import { addCard, exportBackup, getState, importBackup, setCardStatement, setState, updateCard } from "./store";

describe("independent monthly card checklist", () => {
  beforeEach(() => setState(() => ({ cards: [], txs: [], history: [] })));
  const create = () => {
    addCard("Nu", 21, 3, 205093);
    const card = getState().cards[0];
    if (!card) throw new Error("Card was not created");
    return card;
  };

  it("records monthly amount separately from credit limit", () => {
    const card = create();
    setCardStatement(card.id, "2026-11", 85000, false);
    const saved = getState().cards[0];
    if (!saved) throw new Error("Missing card");
    expect(cardMonth(saved, [], 2026, 10).amount).toBe(85000);
    expect(saved.limit).toBe(205093);
  });

  it("marking paid creates no movement and leaves financial balances alone", () => {
    const card = create();
    const initial = getState().initialBalance;
    setCardStatement(card.id, "2026-11", 85000, true);
    expect(getState().txs).toEqual([]);
    expect(getState().initialBalance).toBe(initial);
    const saved = getState().cards[0];
    if (!saved) throw new Error("Missing card");
    expect(cardMonth(saved, [], 2026, 10).status).toBe("paid");
  });

  it("amount and paid flag apply only to the selected month and can be reversed", () => {
    const card = create();
    setCardStatement(card.id, "2026-11", 85000, true);
    const saved = getState().cards[0];
    if (!saved) throw new Error("Missing card");
    expect(cardMonth(saved, [], 2026, 11).status).toBe("pending");
    expect(cardMonth(saved, [], 2026, 11).amount).toBeNull();
    setCardStatement(card.id, "2026-11", 85000, false);
    expect(getState().cards[0]?.statements?.["2026-11"]).toEqual({ amount: 85000, paid: false });
  });

  it("editing card terms preserves earlier monthly records", () => {
    const card = create();
    setCardStatement(card.id, "2026-11", 85000, true);
    updateCard(card.id, { name: "Nu editada", cutDay: 20, payDay: 4, limit: 300000 });
    expect(getState().cards[0]).toMatchObject({ name: "Nu editada", cutDay: 20, payDay: 4, limit: 300000, statements: { "2026-11": { amount: 85000, paid: true } } });
  });

  it("backs up and restores monthly records including a zero amount", () => {
    const card = create();
    setCardStatement(card.id, "2026-11", 0, true);
    const backup = exportBackup();
    setState(() => ({ cards: [] }));
    expect(importBackup(backup)).toBeNull();
    expect(getState().cards[0]?.statements?.["2026-11"]).toEqual({ amount: 0, paid: true });
  });
});