import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const DEBT_TYPES = [
  { key: "Empréstimo", emoji: "🏦" },
  { key: "Cartão", emoji: "💳" },
  { key: "Boleto", emoji: "📄" },
  { key: "Pessoa Física", emoji: "👤" },
  { key: "Financiamento", emoji: "🏠" },
  { key: "Outros", emoji: "📦" },
] as const;

type DebtType = (typeof DEBT_TYPES)[number]["key"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Dividas() {
  const [selType, setSelType] = useState<DebtType>("Empréstimo");
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);

  const utils = trpc.useUtils();
  const { data: debts = [], isLoading } = trpc.debts.list.useQuery();

  const addMut = trpc.debts.add.useMutation({
    onSuccess: () => {
      utils.debts.list.invalidate();
      setDesc(""); setVal("");
      toast.success("Dívida adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar dívida"),
  });

  const toggleMut = trpc.debts.togglePaid.useMutation({
    onMutate: async ({ id, paid }) => {
      await utils.debts.list.cancel();
      const prev = utils.debts.list.getData();
      utils.debts.list.setData(undefined, (old) =>
        old?.map((d) => (d.id === id ? { ...d, paid } : d))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { utils.debts.list.setData(undefined, ctx?.prev); },
    onSettled: () => utils.debts.list.invalidate(),
  });

  const delMut = trpc.debts.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.debts.list.cancel();
      const prev = utils.debts.list.getData();
      utils.debts.list.setData(undefined, (old) => old?.filter((d) => d.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { utils.debts.list.setData(undefined, ctx?.prev); toast.error("Erro ao excluir"); },
    onSettled: () => utils.debts.list.invalidate(),
  });

  const handleAdd = () => {
    const v = parseFloat(val);
    if (!desc.trim() || !v || v <= 0 || !dueDate) { toast.error("Preencha todos os campos"); return; }
    addMut.mutate({ description: desc.trim(), value: v, type: selType, dueDate });
  };

  const pending = debts.filter((d) => !d.paid);
  const paid = debts.filter((d) => d.paid);

  return (
    <div>
      {/* Form */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>Tipo de Dívida</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {DEBT_TYPES.map((t) => (
            <button
              key={t.key}
              className="cat-pill"
              onClick={() => setSelType(t.key)}
              style={
                selType === t.key
                  ? { background: "#D4680A", color: "#fff", borderColor: "#D4680A" }
                  : {}
              }
            >
              {t.emoji} {t.key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            className="fin-input col-span-2"
            placeholder="Descrição da dívida"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            className="fin-input"
            type="number"
            placeholder="Valor R$"
            step="0.01"
            min="0"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
          <input
            className="fin-input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={addMut.isPending}
          className="w-full py-3 rounded-xl font-semibold text-base mt-2 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "#D4680A", color: "#fff" }}
        >
          {addMut.isPending ? "Adicionando..." : "➕ Adicionar Dívida"}
        </button>
      </div>

      {/* List */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
          Minhas Dívidas
          {pending.length > 0 && (
            <span className="ml-2 text-xs font-normal" style={{ color: "#D4680A" }}>
              Pendente: {fmt(pending.reduce((s, d) => s + d.value, 0))}
            </span>
          )}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="spinner" /></div>
        ) : debts.length === 0 ? (
          <div className="empty-state">Nenhuma dívida registrada</div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...pending, ...paid].map((d) => (
              <div key={d.id} className="debt-item" style={{ opacity: d.paid ? 0.65 : 1 }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#1A2744", textDecoration: d.paid ? "line-through" : "none" }}>
                    {d.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#A09880" }}>
                    {d.type} · Vence: {d.dueDate}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: "#D4680A" }}>{fmt(d.value)}</span>
                  <button
                    className={`btn-pay ${d.paid ? "paid" : ""}`}
                    onClick={() => toggleMut.mutate({ id: d.id, paid: !d.paid })}
                  >
                    {d.paid ? "✓ Pago" : "Pagar"}
                  </button>
                  <button className="btn-del" onClick={() => delMut.mutate({ id: d.id })}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
