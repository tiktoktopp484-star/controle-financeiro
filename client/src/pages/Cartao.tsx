import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import LoadingSpinner from "../components/LoadingSpinner";

const FLAGS = [
  { key: "Visa", color: "#1A1F71" },
  { key: "Mastercard", color: "#EB001B" },
  { key: "Elo", color: "#FFD700" },
  { key: "Hipercard", color: "#B22222" },
] as const;

type Flag = (typeof FLAGS)[number]["key"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Cartao() {
  const [selFlag, setSelFlag] = useState<Flag>("Visa");
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState("");
  const [installments, setInstallments] = useState("1");
  const [limit, setLimit] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const utils = trpc.useUtils();
  const { data: cards = [], isLoading } = trpc.cards.list.useQuery();

  const addMut = trpc.cards.add.useMutation({
    onSuccess: () => {
      utils.cards.list.invalidate();
      setDesc(""); setVal(""); setInstallments("1"); setLimit("");
      toast.success("Compra adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar compra"),
  });

  const delMut = trpc.cards.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.cards.list.cancel();
      const prev = utils.cards.list.getData();
      utils.cards.list.setData(undefined, (old) => old?.filter((c) => c.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { utils.cards.list.setData(undefined, ctx?.prev); toast.error("Erro ao excluir"); },
    onSettled: () => utils.cards.list.invalidate(),
  });

  const handleAdd = () => {
    const v = parseFloat(val);
    const inst = parseInt(installments) || 1;
    const lim = parseFloat(limit) || 0;
    if (!desc.trim() || !v || v <= 0) { toast.error("Preencha todos os campos"); return; }
    addMut.mutate({ description: desc.trim(), value: v, flag: selFlag, installments: inst, creditLimit: lim, date });
  };

  const totalUsed = cards.reduce((s, c) => s + c.value, 0);
  const maxLimit = cards.reduce((max, c) => Math.max(max, c.creditLimit), 0);
  const limitPct = maxLimit > 0 ? Math.min(100, (totalUsed / maxLimit) * 100) : 0;

  return (
    <div>
      {/* Form */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>Bandeira do Cartão</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {FLAGS.map((f) => (
            <button
              key={f.key}
              className="cat-pill"
              onClick={() => setSelFlag(f.key)}
              style={
                selFlag === f.key
                  ? { background: "#6B3FA0", color: "#fff", borderColor: "#6B3FA0" }
                  : {}
              }
            >
              💳 {f.key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            className="fin-input col-span-2"
            placeholder="O que você comprou?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            className="fin-input"
            type="number"
            placeholder="Valor total R$"
            step="0.01"
            min="0"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
          <select
            className="fin-input"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
          >
            <option value="1">À vista</option>
            {[2,3,4,5,6,7,8,9,10,11,12,18,24,36,48].map((n) => (
              <option key={n} value={n}>{n}x</option>
            ))}
          </select>
          <input
            className="fin-input"
            type="number"
            placeholder="Limite do cartão R$"
            step="0.01"
            min="0"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
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
          style={{ background: "#6B3FA0", color: "#fff" }}
        >
          {addMut.isPending ? "Adicionando..." : "➕ Adicionar Compra"}
        </button>
      </div>

      {/* Limit bar */}
      {maxLimit > 0 && (
        <div className="section-card">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold" style={{ color: "#1A2744" }}>Limite Utilizado</p>
            <p className="text-xs font-semibold" style={{ color: limitPct > 80 ? "#C0392B" : "#6B3FA0" }}>
              {limitPct.toFixed(0)}%
            </p>
          </div>
          <div className="limit-bar-track">
            <div
              className="limit-bar-fill"
              style={{
                width: `${limitPct}%`,
                background: limitPct > 80 ? "#C0392B" : "#6B3FA0",
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: "#A09880" }}>
            <span>Usado: {fmt(totalUsed)}</span>
            <span>Limite: {fmt(maxLimit)}</span>
          </div>
        </div>
      )}

      {/* List */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
          Compras no Cartão
          {cards.length > 0 && (
            <span className="ml-2 text-xs font-normal" style={{ color: "#6B3FA0" }}>
              Total: {fmt(totalUsed)}
            </span>
          )}
        </p>

        {isLoading ? (
          <LoadingSpinner />
        ) : cards.length === 0 ? (
          <div className="empty-state">Nenhuma compra registrada</div>
        ) : (
          <div className="flex flex-col gap-2">
            {cards.map((c) => (
              <div key={c.id} className="card-purchase-item">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>{c.description}</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: "#6B3FA0", color: "#fff" }}
                    >
                      {c.installments > 1 ? `${c.installments}x` : "À vista"}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#8B6BAE" }}>
                    {c.flag} · {c.date}
                    {c.installments > 1 && ` · ${fmt(c.value / c.installments)}/mês`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: "#6B3FA0" }}>{fmt(c.value)}</span>
                  <button className="btn-del" onClick={() => delMut.mutate({ id: c.id })}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
