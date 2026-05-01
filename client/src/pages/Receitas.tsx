import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Receitas() {
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const utils = trpc.useUtils();
  const { data: incomes = [], isLoading } = trpc.incomes.list.useQuery();

  const addMut = trpc.incomes.add.useMutation({
    onSuccess: () => {
      utils.incomes.list.invalidate();
      setDesc(""); setVal("");
      toast.success("Receita adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar receita"),
  });

  const delMut = trpc.incomes.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.incomes.list.cancel();
      const prev = utils.incomes.list.getData();
      utils.incomes.list.setData(undefined, (old) => old?.filter((i) => i.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { utils.incomes.list.setData(undefined, ctx?.prev); toast.error("Erro ao excluir"); },
    onSettled: () => utils.incomes.list.invalidate(),
  });

  const handleAdd = () => {
    const v = parseFloat(val);
    if (!desc.trim() || !v || v <= 0) { toast.error("Preencha todos os campos"); return; }
    addMut.mutate({ description: desc.trim(), value: v, date });
  };

  return (
    <div>
      {/* Form */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>Nova Receita Extra</p>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            className="fin-input col-span-2"
            placeholder="Descrição da receita"
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
          style={{ background: "#2D7A4F", color: "#fff" }}
        >
          {addMut.isPending ? "Adicionando..." : "➕ Adicionar Receita"}
        </button>
      </div>

      {/* List */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
          Receitas Registradas
          {incomes.length > 0 && (
            <span className="ml-2 text-xs font-normal" style={{ color: "#2D7A4F" }}>
              Total: {fmt(incomes.reduce((s, i) => s + i.value, 0))}
            </span>
          )}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="spinner" /></div>
        ) : incomes.length === 0 ? (
          <div className="empty-state">Nenhuma receita registrada</div>
        ) : (
          <div className="flex flex-col gap-2">
            {incomes.map((i) => (
              <div key={i.id} className="item-row">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#2D7A4F" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>{i.description}</p>
                    <p className="text-xs" style={{ color: "#A09880" }}>{i.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: "#2D7A4F" }}>{fmt(i.value)}</span>
                  <button className="btn-del" onClick={() => delMut.mutate({ id: i.id })}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
