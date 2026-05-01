import { useState } from "react";
import { trpc } from "@/lib/trpc";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toDateKey(date: unknown): string {
  if (date instanceof Date) return date.toISOString().split("T")[0];
  return String(date).split("T")[0];
}

export default function Calendario() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selDay, setSelDay] = useState<number | null>(null);

  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: incomes = [] } = trpc.incomes.list.useQuery();
  const { data: debts = [] } = trpc.debts.list.useQuery();
  const { data: cards = [] } = trpc.cards.list.useQuery();

  const navMonth = (dir: number) => {
    let m = month + dir;
    let y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y); setSelDay(null);
  };

  const getDayKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const getDayItems = (d: number) => {
    const dk = getDayKey(d);
    return {
      exp: expenses.filter((e) => toDateKey(e.date) === dk),
      inc: incomes.filter((i) => toDateKey(i.date) === dk),
      debt: debts.filter((db) => toDateKey(db.dueDate) === dk),
      card: cards.filter((c) => toDateKey(c.date) === dk),
    };
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; type: "prev" | "curr" | "next" }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, type: "prev" });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: "curr" });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, type: "next" });

  const todayKey = today.toISOString().split("T")[0];

  const selItems = selDay ? getDayItems(selDay) : null;
  const allSelItems = selItems
    ? [
        ...selItems.exp.map((e) => ({ ...e, _type: "exp" as const })),
        ...selItems.inc.map((i) => ({ ...i, _type: "inc" as const })),
        ...selItems.debt.map((d) => ({ ...d, _type: "debt" as const })),
        ...selItems.card.map((c) => ({ ...c, _type: "card" as const })),
      ]
    : [];

  return (
    <div>
      <div className="section-card">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navMonth(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90"
            style={{ background: "oklch(0.94 0.02 80)", color: "#1A2744" }}
          >
            ‹
          </button>
          <p className="font-semibold text-base" style={{ color: "#1A2744" }}>
            {MONTHS[month]} {year}
          </p>
          <button
            onClick={() => navMonth(1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all active:scale-90"
            style={{ background: "oklch(0.94 0.02 80)", color: "#1A2744" }}
          >
            ›
          </button>
        </div>

        {/* Weekday headers */}
        <div className="cal-grid mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-xs font-semibold py-1" style={{ color: "#A09880" }}>
              {w}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="cal-grid">
          {cells.map((cell, idx) => {
            if (cell.type !== "curr") {
              return (
                <div key={idx} className="cal-cell other">
                  <span className="dnum">{cell.day}</span>
                </div>
              );
            }
            const dk = getDayKey(cell.day);
            const items = getDayItems(cell.day);
            const isToday = dk === todayKey;
            const isSel = selDay === cell.day;
            const hasExp = items.exp.length > 0;
            const hasInc = items.inc.length > 0;
            const hasDebt = items.debt.length > 0;
            const hasCard = items.card.length > 0;

            return (
              <div
                key={idx}
                className={`cal-cell ${isToday ? "today" : ""} ${isSel ? "sel-day" : ""}`}
                onClick={() => setSelDay(isSel ? null : cell.day)}
              >
                <span className="dnum">{cell.day}</span>
                <div className="dot-row">
                  {hasExp && <span className="ddot dot-e" />}
                  {hasInc && <span className="ddot dot-i" />}
                  {hasDebt && <span className="ddot dot-d" />}
                  {hasCard && <span className="ddot dot-c" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 justify-center flex-wrap">
          {[
            { label: "Despesa", cls: "dot-e" },
            { label: "Receita", cls: "dot-i" },
            { label: "Dívida", cls: "dot-d" },
            { label: "Cartão", cls: "dot-c" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`ddot ${l.cls}`} style={{ width: 8, height: 8 }} />
              <span className="text-xs" style={{ color: "#A09880" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail */}
      {selDay && (
        <div className="section-card">
          <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
            {selDay} de {MONTHS[month]} de {year}
          </p>

          {allSelItems.length === 0 ? (
            <div className="empty-state">Sem lançamentos neste dia</div>
          ) : (
            <div className="flex flex-col gap-2">
              {allSelItems.map((item, idx) => {
                if (item._type === "exp") {
                  return (
                    <div key={idx} className="item-row">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0 dot-e" style={{ background: "#C0392B" }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>{item.description}</p>
                          <p className="text-xs" style={{ color: "#A09880" }}>Despesa · {item.category}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "#C0392B" }}>
                        {fmt(item.value)}
                      </span>
                    </div>
                  );
                }
                if (item._type === "inc") {
                  return (
                    <div key={idx} className="item-row">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#2D7A4F" }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>{item.description}</p>
                          <p className="text-xs" style={{ color: "#A09880" }}>Receita</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "#2D7A4F" }}>
                        {fmt(item.value)}
                      </span>
                    </div>
                  );
                }
                if (item._type === "debt") {
                  return (
                    <div key={idx} className="item-row">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#D4680A" }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>{item.description}</p>
                          <p className="text-xs" style={{ color: "#A09880" }}>Dívida · {item.type}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "#D4680A" }}>
                        {fmt(item.value)}
                      </span>
                    </div>
                  );
                }
                // card
                return (
                  <div key={idx} className="item-row">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#6B3FA0" }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>{item.description}</p>
                        <p className="text-xs" style={{ color: "#A09880" }}>Cartão · {item.flag}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: "#6B3FA0" }}>
                      {fmt(item.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
