import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import Login from "./Login";
import Despesas from "./Despesas";
import Receitas from "./Receitas";
import Dividas from "./Dividas";
import Cartao from "./Cartao";
import Metas from "./Metas";
import Calendario from "./Calendario";
import Graficos from "./Graficos";
import Orcamentos from "./Orcamentos";
import PremiumPlans from "./PremiumPlans";
import AdminPanel from "./AdminPanel";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Tab = "despesas" | "receitas" | "dividas" | "cartao" | "metas" | "calendario" | "graficos" | "orcamentos";

const TAB_DEFS: { id: Tab; emoji: string; label: string; premium?: boolean }[] = [
  { id: "despesas", emoji: "💸", label: "Despesas" },
  { id: "receitas", emoji: "💵", label: "Receitas" },
  { id: "dividas", emoji: "⚠️", label: "Dívidas" },
  { id: "cartao", emoji: "💳", label: "Cartão" },
  { id: "metas", emoji: "🏦", label: "Metas" },
  { id: "calendario", emoji: "📅", label: "Calendário" },
  { id: "graficos", emoji: "📊", label: "Gráficos", premium: true },
  { id: "orcamentos", emoji: "💰", label: "Orçamentos", premium: true },
];

function DebugAdminBtn() {
  const mut = trpc.system.makeAdmin.useMutation({
    onSuccess: () => { toast.success("Agora você é admin! Recarregue a página."); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <button onClick={() => mut.mutate()} disabled={mut.isPending} className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "#C9A84C", color: "#1A2744" }}>
      {mut.isPending ? "..." : "Virar Admin"}
    </button>
  );
}

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

function AlertasBanner() {
  const { data: debts = [] } = trpc.debts.list.useQuery();
  const today = new Date();
  const soon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  const near = debts.filter((d) => {
    if (d.paid) return false;
    const due = new Date(d.dueDate);
    return due >= today && due <= soon;
  });
  if (near.length === 0) return null;
  return (
    <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3" style={{ background: "#FFF3CD", border: "1px solid #FFEAA7" }}>
      <span className="text-lg">⏰</span>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: "#856404" }}>
          {near.length} {near.length === 1 ? "dívida" : "dívidas"} vencem em breve
        </p>
        <div className="text-xs mt-1" style={{ color: "#856404" }}>
          {near.slice(0, 3).map((d) => (
            <span key={d.id} className="mr-3">{d.description} · {new Date(d.dueDate).toLocaleDateString("pt-BR")}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const { user, loading, logout, refresh } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("despesas");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: incomes = [] } = trpc.incomes.list.useQuery();
  const { data: debts = [] } = trpc.debts.list.useQuery();
  const { data: cards = [] } = trpc.cards.list.useQuery();
  const { data: salaries = [] } = trpc.salaries.list.useQuery();
  const { data: budgets = [] } = trpc.budgets.list.useQuery(undefined, { enabled: !!user?.premium });

  const deleteAccountMut = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Conta excluída permanentemente");
      logout();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const fmtCSV = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const handleExportExpenses = () => {
    const rows = [["Descrição", "Valor", "Categoria", "Data"]];
    expenses.forEach((e) => rows.push([e.description, fmtCSV(e.value), e.category ?? "Outros", e.date ?? ""]));
    downloadCSV(`despesas_${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

  const handleExportIncomes = () => {
    const rows = [["Descrição", "Valor", "Data"]];
    incomes.forEach((i) => rows.push([i.description, fmtCSV(i.value), i.date ?? ""]));
    downloadCSV(`receitas_${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

  const handleExportDebts = () => {
    const rows = [["Descrição", "Valor", "Tipo", "Vencimento", "Paga"]];
    debts.forEach((d) => rows.push([d.description, fmtCSV(d.value), d.type, d.dueDate, d.paid ? "Sim" : "Não"]));
    downloadCSV(`dividas_${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

  const handleExportCards = () => {
    const rows = [["Descrição", "Valor", "Bandeira", "Data"]];
    cards.forEach((c) => rows.push([c.description, fmtCSV(c.value), c.flag, c.date ?? ""]));
    downloadCSV(`cartoes_${new Date().toISOString().split("T")[0]}.csv`, rows);
  };

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
        <div className="flex items-center gap-1.5">
          {user?.premium && toggleTheme && (
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90"
              style={{
                background: "rgba(26,39,68,0.08)",
                border: "1px solid rgba(26,39,68,0.12)",
              }}
              title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          )}
          {user?.premium ? (
            <span
              className="px-2 py-1 rounded-lg text-xs font-bold"
              style={{ background: "#C9A84C", color: "#1A2744" }}
            >
              ✦ PREMIUM
            </span>
          ) : (
            <button
              onClick={() => setShowPremium(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E2C47A 100%)",
                color: "#1A2744",
              }}
            >
              Premium
            </button>
          )}
          {(user as any)?.isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
              style={{
                background: "rgba(26,39,68,0.08)",
                color: "#3D4F7C",
                border: "1px solid rgba(26,39,68,0.12)",
              }}
            >
              Admin
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{
              background: "rgba(192,57,43,0.1)",
              color: "#C0392B",
              border: "1px solid rgba(192,57,43,0.2)",
            }}
          >
            Excluir Conta
          </button>
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

      {/* Delete account confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            style={{ maxWidth: 360 }}
          >
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: "#C0392B", fontFamily: "'Cormorant Garamond', serif" }}
            >
              Excluir conta?
            </h3>
            <p className="text-sm mb-6" style={{ color: "#6B6350" }}>
              Todos os seus dados financeiros serão permanentemente removidos. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "#F5F0E8",
                  color: "#6B6350",
                  border: "1px solid #E8E0D0",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteAccountMut.mutate();
                  setShowDeleteConfirm(false);
                }}
                disabled={deleteAccountMut.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#C0392B" }}
              >
                {deleteAccountMut.isPending ? "..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="px-4 pt-4 pb-8" style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Salary section */}
        <SalarySection />

        {/* Summary cards */}
        <SummaryCards />

        {/* Alertas de Vencimento */}
        {user?.premium && <AlertasBanner />}

        {/* Tab bar */}
        <div className="tab-bar mb-4">
          {TAB_DEFS.filter((t) => !t.premium || user?.premium).map((t) => (
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
        {activeTab === "graficos" && <Graficos onOpenPremium={() => setShowPremium(true)} />}
        {activeTab === "orcamentos" && <Orcamentos onOpenPremium={() => setShowPremium(true)} />}

        {/* CSV Export Panel */}
        {user?.premium && (
          <div className="section-card mt-4">
            <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
              Exportar Dados (CSV)
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleExportExpenses} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: "#C0392B", color: "#fff" }}>📥 Despesas</button>
              <button onClick={handleExportIncomes} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: "#2D7A4F", color: "#fff" }}>📥 Receitas</button>
              <button onClick={handleExportDebts} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: "#D4680A", color: "#fff" }}>📥 Dívidas</button>
              <button onClick={handleExportCards} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: "#6B3FA0", color: "#fff" }}>📥 Cartões</button>
            </div>
          </div>
        )}
      </div>

      {/* Premium Plans Modal */}
      {showPremium && <PremiumPlans onClose={() => { setShowPremium(false); refresh(); }} />}

      {/* Admin Panel */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* Debug - remove depois */}
      <div className="fixed bottom-0 left-0 right-0 p-1 text-[10px] text-center z-50 flex items-center justify-center gap-2" style={{ background: "#1A2744", color: "#E2C47A" }}>
        <span>role: {(user as any)?.role} | isAdmin: {JSON.stringify((user as any)?.isAdmin)}</span>
        <DebugAdminBtn />
      </div>
    </div>
  );
}
