import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import LoadingSpinner from "../components/LoadingSpinner";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const DEFAULT_CATEGORIES = [
  "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Casa", "Outros",
];

type Props = {
  onOpenPremium?: () => void;
};

export default function Orcamentos({ onOpenPremium }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [month, setMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [limit, setLimit] = useState("");

  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: budgets = [], refetch, isLoading } = trpc.budgets.list.useQuery(undefined, { enabled: !!user?.premium });

  const upsertMut = trpc.budgets.upsert.useMutation({
    onSuccess: () => {
      refetch();
      setLimit("");
      toast.success("Orçamento salvo!");
    },
    onError: () => toast.error("Erro ao salvar orçamento"),
  });

  const deleteMut = trpc.budgets.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Orçamento removido");
    },
  });

  if (isLoading) return <LoadingSpinner />;

  if (!user?.premium) {
    return (
      <div className="section-card text-center py-8">
        <p className="text-4xl mb-3">💰</p>
        <p className="text-lg font-bold mb-2" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>
          Orçamento Mensal
        </p>
        <p className="text-sm mb-4" style={{ color: "#6B6350" }}>
          Defina limites por categoria e acompanhe seus gastos
        </p>
        <button
          onClick={onOpenPremium}
          className="px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E2C47A 100%)",
            color: "#1A2744",
          }}
        >
          Assinar Premium
        </button>
      </div>
    );
  }

  const spentByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category ?? "Outros";
    spentByCategory[cat] = (spentByCategory[cat] || 0) + e.value;
  });

  const currentBudgets = budgets.filter((b) => b.month === month);
  const spentThisMonth = expenses
    .filter((e) => (e.date ?? "").substring(0, 7) === month)
    .reduce((s, e) => s + e.value, 0);

  const handleSave = () => {
    const v = parseFloat(limit);
    if (!v || v <= 0) { toast.error("Digite um valor válido"); return; }
    upsertMut.mutate({ category, month, spendingLimit: v });
  };

  return (
    <div>
      <div className="section-card">
        <p className="text-sm font-semibold mb-1" style={{ color: "#1A2744" }}>
          Novo Orçamento
        </p>
        <p className="text-xs mb-3" style={{ color: "#A09880" }}>
          Defina um limite de gastos para uma categoria
        </p>

        <label className="text-xs font-medium mb-1 block" style={{ color: "#6B6350" }}>Categoria</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="fin-input mb-2"
        >
          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="text-xs font-medium mb-1 block" style={{ color: "#6B6350" }}>Mês</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="fin-input mb-2"
        />

        <label className="text-xs font-medium mb-1 block" style={{ color: "#6B6350" }}>Limite R$</label>
        <input
          type="number"
          placeholder="Valor do limite"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="fin-input mb-3"
          step="0.01"
          min="0"
        />

        <button
          onClick={handleSave}
          disabled={upsertMut.isPending}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "#1A2744", color: "#E2C47A" }}
        >
          {upsertMut.isPending ? "Salvando..." : "Salvar Orçamento"}
        </button>
      </div>

      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
          Orçamentos de {month}
          <span className="ml-2 text-xs font-normal" style={{ color: "#A09880" }}>
            Total gasto: {fmt(spentThisMonth)}
          </span>
        </p>

        {currentBudgets.length === 0 ? (
          <div className="empty-state">Nenhum orçamento definido para este mês</div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentBudgets.map((b) => {
              const spent = spentByCategory[b.category] || 0;
              const limit = parseFloat(b.spendingLimit as unknown as string);
              const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
              const isOver = spent > limit;
              return (
                <div key={b.id} className="p-4 rounded-xl" style={{ background: "#F5F0E8", border: "1px solid #E8E0D0" }}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold" style={{ color: "#1A2744" }}>{b.category}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: isOver ? "#C0392B" : "#2D7A4F" }}>
                        {fmt(spent)} / {fmt(limit)}
                      </span>
                      <button
                        onClick={() => deleteMut.mutate({ id: b.id })}
                        className="text-xs"
                        style={{ color: "#C0392B" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: "#E8E0D0" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isOver ? "#C0392B" : pct > 80 ? "#E67E22" : "#2D7A4F",
                      }}
                    />
                  </div>
                  {isOver && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: "#C0392B" }}>
                      ⚠️ Limite excedido em {fmt(spent - limit)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
