"use client";

import { Check, Plus, Trash2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpendItem = {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  date: string;
};

type SpendDay = {
  date: string;
  total: number;
  items: SpendItem[];
};

type MoneyItem = {
  id: string;
  personName: string;
  amount: number;
  note: string | null;
  settled: boolean;
  date: string;
};

type SpendData = {
  month: string;
  budget: number | null;
  spent: number;
  remaining: number | null;
  days: SpendDay[];
  given: MoneyItem[];
  owed: MoneyItem[];
  openGiven: number;
  openOwed: number;
};

const categories = ["Fare", "Meal", "Clothes", "Grocery", "Other"];

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function localDateInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

export function SpendingView() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<SpendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [loanDirection, setLoanDirection] = useState<"GIVEN" | "OWED">("GIVEN");
  const [personName, setPersonName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanNote, setLoanNote] = useState("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/spending?month=${month}`);
    if (!response.ok) throw new Error("Could not load spending");
    const next = (await response.json()) as SpendData;
    setData(next);
    setBudgetInput(next.budget == null ? "" : String(next.budget));
    setError("");
  }, [month]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError("Could not load spending."))
      .finally(() => setLoading(false));
  }, [load]);

  async function addSpend() {
    if (!name.trim() || !amount) return;
    setSaving(true);
    const response = await fetch("/api/spending/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        amount,
        category: category || undefined,
        date: localDateInput(),
      }),
    });
    setSaving(false);
    if (response.ok) {
      setName("");
      setAmount("");
      await load();
    }
  }

  async function removeSpend(id: string) {
    const response = await fetch(`/api/spending/items?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (response.ok) await load();
  }

  async function saveBudget() {
    const response = await fetch("/api/spending/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        amount: budgetInput.trim() === "" ? null : budgetInput,
      }),
    });
    if (response.ok) await load();
  }

  async function addLoan() {
    if (!personName.trim() || !loanAmount) return;
    setSaving(true);
    const response = await fetch("/api/spending/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: loanDirection,
        personName,
        amount: loanAmount,
        note: loanNote,
        date: localDateInput(),
      }),
    });
    setSaving(false);
    if (response.ok) {
      setPersonName("");
      setLoanAmount("");
      setLoanNote("");
      await load();
    }
  }

  async function toggleLoan(id: string, settled: boolean) {
    const response = await fetch("/api/spending/loans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, settled: !settled }),
    });
    if (response.ok) await load();
  }

  async function removeLoan(id: string) {
    const response = await fetch(`/api/spending/loans?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (response.ok) await load();
  }

  const remainingClass = useMemo(() => {
    if (data?.remaining == null) return "text-[#5f5e5a]";
    if (data.remaining < 0) return "text-[#a7463d]";
    return "text-[#367653]";
  }, [data?.remaining]);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.04em]">Spending</h1>
          <p className="mt-1 text-sm text-[#777671]">
            Track this month&apos;s spends, budget, and money given or owed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-[#deddd8] px-2.5 py-1.5 text-[12px] font-semibold"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
          >
            Prev
          </button>
          <p className="min-w-28 text-center text-[13px] font-semibold">
            {monthLabel(month)}
          </p>
          <button
            className="rounded-lg border border-[#deddd8] px-2.5 py-1.5 text-[12px] font-semibold"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
          >
            Next
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-[#a7463d]">{error}</p> : null}
      {loading && !data ? <p className="text-sm text-[#8f8e89]">Loading spending…</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Spent" value={money(data?.spent ?? 0)} hint="this month" />
        <SummaryCard
          label="Budget left"
          value={data?.remaining == null ? "—" : money(data.remaining)}
          hint={data?.budget == null ? "set a monthly total" : `of ${money(data.budget)}`}
          valueClass={remainingClass}
        />
        <SummaryCard
          label="I gave"
          value={money(data?.openGiven ?? 0)}
          hint="still to get back"
        />
        <SummaryCard
          label="I need to pay"
          value={money(data?.openOwed ?? 0)}
          hint="still outstanding"
        />
      </div>

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-bold">
          <Wallet size={15} className="text-[#6d5bd0]" />
          Monthly total
        </h2>
        <p className="mt-1 text-[12px] text-[#8f8e89]">
          Optional. If you add how much you have this month, spends deduct from it.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            className="min-w-0 flex-1 rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
            placeholder="I have this much this month"
            value={budgetInput}
            onChange={(event) => setBudgetInput(event.target.value)}
          />
          <button
            className="rounded-xl bg-[#292927] px-4 py-3 text-[12px] font-semibold text-white"
            onClick={() => void saveBudget()}
          >
            Save
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <h2 className="text-[13px] font-bold">Add spending</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                category === item
                  ? "bg-[#292927] text-white"
                  : "border border-[#deddd8] text-[#5f5e5a]"
              }`}
              onClick={() => {
                setCategory(item);
                setName(item);
                amountRef.current?.focus();
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
          <input
            className="rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
            placeholder="Item name, e.g. biscuits"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addSpend();
            }}
          />
          <input
            ref={amountRef}
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
            placeholder="Price"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addSpend();
            }}
          />
          <button
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#6d5bd0] px-4 py-3 text-[12px] font-semibold text-white disabled:opacity-50"
            disabled={!name.trim() || !amount || saving}
            onClick={() => void addSpend()}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold">This month</h2>
          <p className="text-[13px] font-bold">{money(data?.spent ?? 0)}</p>
        </div>
        {data?.days.length ? (
          <div className="mt-4 space-y-4">
            {data.days.map((day) => (
              <div key={day.date}>
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#8f8e89]">
                  <p>{formatDay(day.date)}</p>
                  <p>{money(day.total)}</p>
                </div>
                <div className="mt-2 space-y-2">
                  {day.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-[#ecebe7] px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">{item.name}</p>
                        {item.category ? (
                          <p className="text-[11px] text-[#8f8e89]">{item.category}</p>
                        ) : null}
                      </div>
                      <p className="text-[13px] font-bold">{money(item.amount)}</p>
                      <button
                        aria-label={`Delete ${item.name}`}
                        className="rounded-md p-1 text-[#aaa9a4] hover:text-[#a7463d]"
                        onClick={() => void removeSpend(item.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#8f8e89]">
            No spends this month yet. Add biscuits, fare, meals, clothes — anything.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[#e6e5e0] bg-white p-5">
        <h2 className="text-[13px] font-bold">Give / need to pay</h2>
        <div className="mt-3 flex gap-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              loanDirection === "GIVEN"
                ? "bg-[#292927] text-white"
                : "border border-[#deddd8] text-[#5f5e5a]"
            }`}
            onClick={() => setLoanDirection("GIVEN")}
          >
            I gave money
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
              loanDirection === "OWED"
                ? "bg-[#292927] text-white"
                : "border border-[#deddd8] text-[#5f5e5a]"
            }`}
            onClick={() => setLoanDirection("OWED")}
          >
            I need to pay
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
            placeholder="Person name"
            value={personName}
            onChange={(event) => setPersonName(event.target.value)}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className="rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
            placeholder="Amount"
            value={loanAmount}
            onChange={(event) => setLoanAmount(event.target.value)}
          />
        </div>
        <input
          className="mt-2 w-full rounded-xl border border-[#deddd8] bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:border-[#8a79dc]"
          placeholder="Note, optional"
          value={loanNote}
          onChange={(event) => setLoanNote(event.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <button
            className="rounded-xl bg-[#6d5bd0] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            disabled={!personName.trim() || !loanAmount || saving}
            onClick={() => void addLoan()}
          >
            Save
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <LoanList
            title="I gave"
            empty="No given money to track."
            items={data?.given ?? []}
            onToggle={toggleLoan}
            onRemove={removeLoan}
          />
          <LoanList
            title="I need to pay"
            empty="Nothing outstanding to pay."
            items={data?.owed ?? []}
            onToggle={toggleLoan}
            onRemove={removeLoan}
          />
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  valueClass = "",
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e6e5e0] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-[12px] text-[#8f8e89]">{hint}</p>
    </div>
  );
}

function LoanList({
  title,
  empty,
  items,
  onToggle,
  onRemove,
}: {
  title: string;
  empty: string;
  items: MoneyItem[];
  onToggle: (id: string, settled: boolean) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <div>
      <h3 className="text-[12px] font-bold">{title}</h3>
      {items.length ? (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                item.settled ? "border-[#ecebe7] opacity-55" : "border-[#ecebe7]"
              }`}
            >
              <button
                aria-label={item.settled ? "Mark open" : "Mark settled"}
                className={`mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full border ${
                  item.settled
                    ? "border-[#55a276] bg-[#55a276] text-white"
                    : "border-[#cac9c4] bg-white"
                }`}
                onClick={() => void onToggle(item.id, item.settled)}
              >
                {item.settled ? <Check size={12} strokeWidth={3} /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{item.personName}</p>
                {item.note ? (
                  <p className="text-[11px] text-[#8f8e89]">{item.note}</p>
                ) : null}
              </div>
              <p className="text-[13px] font-bold">{money(item.amount)}</p>
              <button
                aria-label={`Delete ${item.personName}`}
                className="rounded-md p-1 text-[#aaa9a4] hover:text-[#a7463d]"
                onClick={() => void onRemove(item.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#8f8e89]">{empty}</p>
      )}
    </div>
  );
}
