import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Login from "./Login";
import Despesas from "./Despesas";
import Receitas from "./Receitas";
import Dividas from "./Dividas";
import Cartao from "./Cartao";
import Metas from "./Metas";
import Calendario from "./Calendario";
import PremiumPlans from "./PremiumPlans";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Tab = "despesas" | "receitas" | "dividas" | "cartao" | "metas" | "calendario";

const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id: "despesas", emoji: "💸", label: "Despesas" },
  { id: "receitas", emoji: "💵", label: "Receitas" },
  { id: "dividas", emoji: "⚠️", label: "Dívidas" },
  { id: "cartao", emoji: "💳", label: "Cartão" },
  { id: "metas", emoji: "🏦", label: "Metas" },
  { id: "calendario", emoji: "📅", label: "Calendário" },
];

function SalarySection() {
  const [showForm, setShowForm] = useState(false);
  const [salVal, setSalVal] = useState("");
  const [salDesc, setSalDesc] = useState("Salário");

  const utils = trpc.useUtils();
  const { data: salaries = [] } = trpc.salaries.list.useQuery();

  const addMut = trpc.salaries.add.useMutation({
    onSuccess: () => {
      utils.salaries.list.invalidate();
      setSalVal(""); setSalDesc("Salário"); setShowForm(false);
      toast.success("Salário adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar salário"),
  });

  const delMut = trpc.salaries.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.salaries.list.cancel();
      const prev = utils.salaries.list.getData();
      utils.salaries.list.setData(undefined, (old) => old?.filter((s) => s.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { utils.salaries.list.setData(undefined, ctx?.prev); },
    onSettled: () => utils.salaries.list.invalidate(),
  });

  const totalSal = salaries.reduce((s, sal) => s + sal.value, 0);

  const handleSave = () => {
    const v = parseFloat(salVal);
    if (!v || v <= 0) { toast.error("Digite um valor válido"); return; }
    addMut.mutate({
      value: v,
      description: salDesc || "Salário",
      date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
        boxShadow: "0 4px 20px rgba(26,39,68,0.25)",
      }}
    >
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "rgba(226,196,122,0.7)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.12em" }}
          >
            Total de Salários
          </p>
          <p
            className="text-3xl font-bold"
            style={{ color: "#E2C47A", fontFamily: "'Cormorant Garamond', serif" }}
          >
            {fmt(totalSal)}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: "rgba(226,196,122,0.15)",
            color: "#E2C47A",
            border: "1px solid rgba(226,196,122,0.3)",
          }}
        >
          {showForm ? "Cancelar" : "+ Adicionar"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 animate-fade-in-up">
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(226,196,122,0.3)" }}
              placeholder="Descrição (ex: Salário CLT)"
              value={salDesc}
              onChange={(e) => setSalDesc(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(226,196,122,0.3)" }}
              type="number"
              placeholder="Valor R$"
              step="0.01"
              min="0"
              value={salVal}
              onChange={(e) => setSalVal(e.target.value)}
            />
            <button
              onClick={handleSave}
              disabled={addMut.isPending}
              className="px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "#E2C47A", color: "#1A2744" }}
            >
              {addMut.isPending ? "..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Salary list */}
      {salaries.length > 0 && (
        <div className="flex flex-col gap-2">
          {salaries.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(226,196,122,0.15)" }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: "#E2C47A" }}>{s.description}</p>
                <p className="text-xs" style={{ color: "rgba(226,196,122,0.5)" }}>{s.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "#E2C47A" }}>{fmt(s.value)}</span>
                <button
                  onClick={() => delMut.mutate({ id: s.id })}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
                  style={{ background: "rgba(192,57,43,0.2)", color: "#ff8a80" }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PremiumSection() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showPlans, setShowPlans] = useState(false);

  const handleDarkMode = () => {
    if (!user?.premium) {
      setShowPlans(true);
      return;
    }
    toggleTheme?.();
  };

  return (
    <>
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        background: user?.premium
          ? "linear-gradient(135deg, #C9A84C 0%, #E2C47A 100%)"
          : "rgba(201,168,76,0.08)",
        border: user?.premium ? "none" : "1px dashed rgba(201,168,76,0.4)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p
            className="text-xs font-bold tracking-widest uppercase mb-1"
            style={{
              color: user?.premium ? "#1A2744" : "#C9A84C",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.12em",
            }}
          >
            {user?.premium ? "✦ Premium Ativo" : "Premium"}
          </p>
          <p
            className="text-sm"
            style={{
              color: user?.premium ? "#1A2744" : "#A09880",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {user?.premium
              ? (() => {
                  const until = user.premiumUntil ? new Date(user.premiumUntil) : null;
                  if (until) {
                    const diff = until.getTime() - Date.now();
                    if (diff > 0) {
                      const days = Math.ceil(diff / 86400000);
                      if (days >= 1) return `🎁 Teste grátis — ${days} dia${days > 1 ? "s" : ""} restante${days > 1 ? "s" : ""}`;
                      return "⏳ Teste grátis — termina hoje";
                    }
                    return "Você tem acesso a todos os recursos premium.";
                  }
                  return "Você tem acesso a todos os recursos premium.";
                })()
              : "Desbloqueie recursos exclusivos para controlar suas finanças."}
          </p>
        </div>
        <div className="flex gap-2">
          {user?.premium ? (
            <button
              onClick={() => setShowPlans(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{
                background: "#1A2744",
                color: "#E2C47A",
              }}
            >
              Gerenciar
            </button>
          ) : (
            <button
              onClick={() => setShowPlans(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E2C47A 100%)",
                color: "#1A2744",
              }}
            >
              Assinar Premium
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDarkMode}
          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={{
            background: theme === "dark" ? "#1A2744" : "rgba(26,39,68,0.1)",
            color: user?.premium ? (theme === "dark" ? "#E2C47A" : "#1A2744") : "#A09880",
            border: "1px solid rgba(201,168,76,0.3)",
          }}
        >
          {theme === "dark" ? "☀️ Modo Claro" : "🌙 Modo Escuro"}
        </button>
      </div>
    </div>
      {showPlans && <PremiumPlans onClose={() => setShowPlans(false)} />}
    </>
  );
}

function PremiumChart() {
  const { user } = useAuth();
  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: incomes = [] } = trpc.incomes.list.useQuery();
  const csvQuery = trpc.data.exportCsv.useQuery(undefined, { enabled: false });
  const projQuery = trpc.premium.projection.useQuery(undefined, { enabled: !!user?.premium });
  const yearlyQuery = trpc.premium.yearlyOverview.useQuery(undefined, { enabled: !!user?.premium });
  const alertsQuery = trpc.premium.debtAlerts.useQuery(undefined, { enabled: !!user?.premium });
  const catsQuery = trpc.premium.listCategories.useQuery(undefined, { enabled: !!user?.premium });
  const budgetQuery = trpc.premium.budgetProgress.useQuery(undefined, { enabled: !!user?.premium });
  const addCatMut = trpc.premium.addCategory.useMutation({ onSuccess: () => { catsQuery.refetch(); toast.success("Categoria criada!"); } });
  const delCatMut = trpc.premium.deleteCategory.useMutation({ onSuccess: () => catsQuery.refetch() });
  const upsertBudMut = trpc.premium.upsertBudget.useMutation({ onSuccess: () => { budgetQuery.refetch(); toast.success("Orçamento salvo!"); } });

  const [newCat, setNewCat] = useState("");
  const [budgetCats, setBudgetCats] = useState<Record<string, string>>({});
  const [chartTab, setChartTab] = useState<"pie" | "yearly" | "proj">("pie");

  if (!user?.premium) return null;

  const handleExport = async () => {
    const result = await csvQuery.refetch();
    if (result.data?.csv) {
      const blob = new Blob([result.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dados-financeiros.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado!");
    }
  };

  const COLORS = ["#C9A84C", "#1A2744", "#2D7A4F", "#C0392B", "#6B6350", "#3D4F7C", "#A09880", "#D4680A", "#6B3FA0"];

  const byCategory: Record<string, number> = {};
  expenses.forEach((e) => { byCategory[e.customCategory || e.category] = (byCategory[e.customCategory || e.category] || 0) + e.value; });
  const pieData = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const totalExp = expenses.reduce((s, e) => s + e.value, 0);
  const totalInc = incomes.reduce((s, i) => s + i.value, 0);

  const catNames = [...pieData.map(d => d.name), ...(catsQuery.data || []).map(c => c.name)];
  const uniqueCats = Array.from(new Set(catNames));

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#E2C47A", letterSpacing: "0.12em" }}>
          📊 Análise Premium
        </p>
        <button onClick={handleExport} disabled={csvQuery.isFetching}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(226,196,122,0.2)", color: "#E2C47A", border: "1px solid rgba(226,196,122,0.3)" }}>
          {csvQuery.isFetching ? "..." : "Exportar CSV"}
        </button>
      </div>

      {/* Debt Alerts */}
      {alertsQuery.data && alertsQuery.data.length > 0 && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.3)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#ff8a80" }}>🔔 Dívidas a Vencer (7 dias)</p>
          {alertsQuery.data.map(d => (
            <p key={d.id} className="text-xs" style={{ color: "rgba(255,138,128,0.8)" }}>
              {d.description} — {fmt(d.value)} (vence {String(d.dueDate).slice(0, 10)})
            </p>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="text-xs mb-3" style={{ color: "rgba(226,196,122,0.7)" }}>
        Receitas: {fmt(totalInc)} · Despesas: {fmt(totalExp)} · Saldo: {fmt(totalInc - totalExp)}
      </div>

      {/* Chart tabs */}
      <div className="flex gap-1 mb-3">
        {(["pie", "yearly", "proj"] as const).map(tab => (
          <button key={tab} onClick={() => setChartTab(tab)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{ background: chartTab === tab ? "#E2C47A" : "rgba(226,196,122,0.15)", color: chartTab === tab ? "#1A2744" : "#E2C47A" }}>
            {tab === "pie" ? "Categorias" : tab === "yearly" ? "Anual" : "Projeção"}
          </button>
        ))}
      </div>

      {/* Pie chart */}
      {chartTab === "pie" && pieData.length > 0 && (
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-1">
            {pieData.map((d, i) => (
              <span key={d.name} className="text-xs" style={{ color: COLORS[i % COLORS.length] }}>● {d.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Yearly chart */}
      {chartTab === "yearly" && yearlyQuery.data && yearlyQuery.data.length > 0 && (
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={yearlyQuery.data}>
              <XAxis dataKey="month" tick={{ fill: "#A09880", fontSize: 9 }} />
              <YAxis tick={{ fill: "#A09880", fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="income" fill="#2D7A4F" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#C0392B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Projection */}
      {chartTab === "proj" && projQuery.data && (
        <div className="mb-4">
          <div className="flex gap-2 mb-2 text-xs" style={{ color: "rgba(226,196,122,0.7)" }}>
            <span>Média Receita: {fmt(projQuery.data.avgIncome)}</span>
            <span>Média Despesa: {fmt(projQuery.data.avgExpense)}</span>
            <span>Saldo: {fmt(projQuery.data.monthlyBalance)}</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={projQuery.data.projection}>
              <XAxis dataKey="month" tick={{ fill: "#A09880", fontSize: 9 }} />
              <YAxis tick={{ fill: "#A09880", fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="projected" fill="#C9A84C" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Orçamentos */}
      <div className="mb-3">
        <p className="text-xs font-bold mb-2" style={{ color: "#E2C47A" }}>Orçamento Mensal</p>
        {uniqueCats.slice(0, 6).map(cat => {
          const budget = budgetQuery.data?.find(b => b.category === cat);
          const pct = budget ? Math.min(budget.percent, 100) : 0;
          return (
            <div key={cat} className="mb-2">
              <div className="flex justify-between text-xs mb-0.5" style={{ color: "#A09880" }}>
                <span>{cat}</span>
                <span>{budget ? `${fmt(budget.spent)} / ${fmt(budget.limit)}` : "sem orçamento"}</span>
              </div>
              {budget ? (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${pct}%`,
                    background: pct > 100 ? "#C0392B" : pct > 80 ? "#D4680A" : "#C9A84C"
                  }} />
                </div>
              ) : (
                <div className="flex gap-1">
                  <input type="number" placeholder="Limite R$"
                    className="flex-1 rounded-lg px-2 py-1 text-xs outline-none"
                    style={{ background: "rgba(255,255,255,0.1)", color: "#E2C47A", border: "1px solid rgba(226,196,122,0.3)" }}
                    value={budgetCats[cat] || ""}
                    onChange={e => setBudgetCats(p => ({ ...p, [cat]: e.target.value }))} />
                  <button onClick={() => {
                    const val = parseFloat(budgetCats[cat]);
                    if (val > 0) upsertBudMut.mutate({ category: cat, spendingLimit: val });
                  }} className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: "#C9A84C", color: "#1A2744" }}>
                    OK
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Categorias personalizadas */}
      <div className="mb-2">
        <p className="text-xs font-bold mb-2" style={{ color: "#E2C47A" }}>Categorias Personalizadas</p>
        <div className="flex gap-1 mb-1">
          <input type="text" placeholder="Nova categoria"
            className="flex-1 rounded-lg px-2 py-1 text-xs outline-none"
            style={{ background: "rgba(255,255,255,0.1)", color: "#E2C47A", border: "1px solid rgba(226,196,122,0.3)" }}
            value={newCat} onChange={e => setNewCat(e.target.value)} />
          <button onClick={() => { if (newCat.trim()) { addCatMut.mutate({ name: newCat.trim() }); setNewCat(""); } }}
            className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: "#C9A84C", color: "#1A2744" }}>
            + Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {(catsQuery.data || []).map(c => (
            <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs"
              style={{ background: "rgba(226,196,122,0.15)", color: "#E2C47A", border: "1px solid rgba(226,196,122,0.3)" }}>
              {c.name}
              <button onClick={() => delCatMut.mutate({ id: c.id })} className="text-xs ml-1" style={{ color: "#ff8a80" }}>✕</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCards() {
  const { data: salaries = [] } = trpc.salaries.list.useQuery();
  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: incomes = [] } = trpc.incomes.list.useQuery();
  const { data: cards = [] } = trpc.cards.list.useQuery();

  const totalSalary = salaries.reduce((s, sal) => s + sal.value, 0);
  const totalInc = totalSalary + incomes.reduce((s, i) => s + i.value, 0);
  const totalExp = expenses.reduce((s, e) => s + e.value, 0) + cards.reduce((s, c) => s + c.value, 0);
  const balance = totalInc - totalExp;

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="summary-card">
        <p className="text-xs font-medium mb-2" style={{ color: "#A09880" }}>Renda Total</p>
        <p className="text-base font-bold" style={{ color: "#2D7A4F" }}>{fmt(totalInc)}</p>
      </div>
      <div className="summary-card">
        <p className="text-xs font-medium mb-2" style={{ color: "#A09880" }}>Gastos Totais</p>
        <p className="text-base font-bold" style={{ color: "#C0392B" }}>{fmt(totalExp)}</p>
      </div>
      <div className="summary-card">
        <p className="text-xs font-medium mb-2" style={{ color: "#A09880" }}>Saldo</p>
        <p
          className="text-base font-bold"
          style={{ color: balance >= 0 ? "#2D7A4F" : "#C0392B" }}
        >
          {fmt(balance)}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("despesas");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center sacred-bg">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 36, height: 36 }} />
          <p className="text-sm" style={{ color: "#A09880", fontFamily: "'Cormorant Garamond', serif" }}>
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div
      className="min-h-screen sacred-bg"
      style={{ minHeight: "100dvh" }}
    >
      {/* Top header bar */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(248,243,232,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(201,168,76,0.2)",
        }}
      >
        <div>
          <h1
            className="text-lg font-bold leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1A2744" }}
          >
            Controle Financeiro
          </h1>
          <p className="text-xs" style={{ color: "#C9A84C", fontFamily: "'Inter', sans-serif" }}>
            {user.name ?? user.email ?? "Usuário"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.premium && (
            <span
              className="px-2 py-0.5 rounded-lg text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, #C9A84C, #E2C47A)",
                color: "#1A2744",
              }}
            >
              PREMIUM
            </span>
          )}
          <button
            onClick={() => logout()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{
              background: "rgba(26,39,68,0.08)",
              color: "#3D4F7C",
              border: "1px solid rgba(26,39,68,0.12)",
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-4 pt-4 pb-8" style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Salary section */}
        <SalarySection />

        {/* Premium test */}
        <PremiumSection />

        {/* Premium chart */}
        <PremiumChart />

        {/* Summary cards */}
        <SummaryCards />

        {/* Tab bar */}
        <div className="tab-bar mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-item ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="text-base">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {activeTab === "despesas" && <Despesas />}
        {activeTab === "receitas" && <Receitas />}
        {activeTab === "dividas" && <Dividas />}
        {activeTab === "cartao" && <Cartao />}
        {activeTab === "metas" && <Metas />}
        {activeTab === "calendario" && <Calendario />}
      </div>
    </div>
  );
}
