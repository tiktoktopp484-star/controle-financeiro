import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "Alimentação", emoji: "🍔", color: "#E74C3C" },
  { key: "Transporte", emoji: "🚗", color: "#2980B9" },
  { key: "Saúde", emoji: "💊", color: "#27AE60" },
  { key: "Lazer", emoji: "🎬", color: "#8E44AD" },
  { key: "Educação", emoji: "📚", color: "#E67E22" },
  { key: "Casa", emoji: "🏠", color: "#16A085" },
  { key: "Outros", emoji: "📦", color: "#7F8C8D" },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Despesas() {
  const [selCat, setSelCat] = useState<Category>("Outros");
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const utils = trpc.useUtils();
  const { data: expenses = [], isLoading } = trpc.expenses.list.useQuery();

  const addMut = trpc.expenses.add.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      setDesc(""); setVal("");
      toast.success("Despesa adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar despesa"),
  });

  const delMut = trpc.expenses.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.expenses.list.cancel();
      const prev = utils.expenses.list.getData();
      utils.expenses.list.setData(undefined, (old) => old?.filter((e) => e.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { utils.expenses.list.setData(undefined, ctx?.prev); toast.error("Erro ao excluir"); },
    onSettled: () => utils.expenses.list.invalidate(),
  });

  const handleAdd = () => {
    const v = parseFloat(val);
    if (!desc.trim() || !v || v <= 0) { toast.error("Preencha todos os campos"); return; }
    addMut.mutate({ description: desc.trim(), value: v, category: selCat, date });
  };

  const catColor = (cat: string) => CATEGORIES.find((c) => c.key === cat)?.color ?? "#7F8C8D";

  return (
    <div>
      {/* Form */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>Categoria</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className="cat-pill"
              onClick={() => setSelCat(c.key)}
              style={
                selCat === c.key
                  ? { background: c.color, color: "#fff", borderColor: c.color }
                  : {}
              }
            >
              {c.emoji} {c.key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            className="fin-input col-span-2"
            placeholder="O que você gastou?"
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
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={addMut.isPending}
          className="w-full py-3 rounded-xl font-semibold text-base mt-2 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "#C0392B", color: "#fff" }}
        >
          {addMut.isPending ? "Adicionando..." : "➕ Adicionar Despesa"}
        </button>
      </div>

      {/* List */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
          Despesas Registradas
          {expenses.length > 0 && (
            <span className="ml-2 text-xs font-normal" style={{ color: "#C0392B" }}>
              Total: {fmt(expenses.reduce((s, e) => s + e.value, 0))}
            </span>
          )}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="spinner" /></div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">Nenhuma despesa registrada</div>
        ) : (
          <div className="flex flex-col gap-2">
            {expenses.map((e) => (
              <div key={e.id} className="item-row">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: catColor(e.category ?? "Outros") }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>{e.description}</p>
                    <p className="text-xs" style={{ color: "#A09880" }}>{e.category} · {e.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: "#C0392B" }}>{fmt(e.value)}</span>
                  <button className="btn-del" onClick={() => delMut.mutate({ id: e.id })}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
