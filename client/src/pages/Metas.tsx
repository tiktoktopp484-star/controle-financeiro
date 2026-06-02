import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import LoadingSpinner from "../components/LoadingSpinner";

const goalCategoryIcons: Record<string, string> = {
  Viagem: "✈️",
  Casa: "🏠",
  Carro: "🚗",
  Educacao: "📚",
  Saude: "🏥",
  Lazer: "🎮",
  Outros: "💰",
};

const goalCategoryColors: Record<string, string> = {
  Viagem: "#FF6B6B",
  Casa: "#4ECDC4",
  Carro: "#45B7D1",
  Educacao: "#FFA07A",
  Saude: "#98D8C8",
  Lazer: "#F7DC6F",
  Outros: "#BB8FCE",
};

const FREE_GOAL_LIMIT = 3;

export default function Metas() {
  const { user } = useAuth();
  const { data: goals = [], isLoading, refetch } = trpc.goals.list.useQuery();
  const addMut = trpc.goals.add.useMutation({ onSuccess: () => { refetch(); setShowForm(false); } });
  const depositMut = trpc.goals.deposit.useMutation({ onSuccess: () => refetch() });
  const toggleMut = trpc.goals.toggleCompleted.useMutation({ onSuccess: () => refetch() });
  const deleteMut = trpc.goals.delete.useMutation({ onSuccess: () => refetch() });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [category, setCategory] = useState<"Viagem" | "Casa" | "Carro" | "Educacao" | "Saude" | "Lazer" | "Outros">("Outros");
  const [dueDate, setDueDate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositingId, setDepositingId] = useState<number | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  const handleAdd = () => {
    if (!name.trim() || !target) { toast.error("Preencha nome e valor alvo"); return; }
    const t = parseFloat(target);
    if (t <= 0) { toast.error("Valor alvo deve ser positivo"); return; }
    addMut.mutate({ name: name.trim(), description: desc.trim(), targetAmount: t, category, dueDate: dueDate || undefined });
  };

  const handleDeposit = (goalId: number) => {
    if (!depositAmount) { toast.error("Digite um valor"); return; }
    const amt = parseFloat(depositAmount);
    if (amt <= 0) { toast.error("Valor deve ser positivo"); return; }
    depositMut.mutate({ id: goalId, amount: amt }, {
      onSuccess: (result) => {
        if (result.completed) toast.success("🎉 Meta atingida!");
        setDepositAmount("");
        setDepositingId(null);
      },
    });
  };

  return (
    <div>
      {/* Form */}
      {showForm && (
        <div className="section-card mb-4">
          <h3 className="text-lg font-semibold mb-3" style={{ color: "#1A2744" }}>Nova Meta</h3>
          <input
            type="text"
            placeholder="Nome da meta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field mb-2"
          />
          <textarea
            placeholder="Descrição (opcional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="input-field mb-2"
            rows={2}
          />
          <input
            type="number"
            placeholder="Valor alvo R$"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="input-field mb-2"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="input-field mb-2"
          >
            {Object.keys(goalCategoryIcons).map((cat) => (
              <option key={cat} value={cat}>
                {goalCategoryIcons[cat]} {cat}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input-field mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={addMut.isPending}
              className="btn-primary flex-1"
              style={{ opacity: addMut.isPending ? 0.6 : 1 }}
            >
              {addMut.isPending ? "Salvando..." : "Criar Meta"}
            </button>
            <button onClick={() => { setShowForm(false); setName(""); setDesc(""); setTarget(""); setDueDate(""); }} className="btn-secondary flex-1">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => {
            if (!user?.premium && goals.length >= FREE_GOAL_LIMIT) {
              toast.error(`Limite de ${FREE_GOAL_LIMIT} metas no plano grátis. Assine o Premium para criar ilimitadas.`);
              return;
            }
            setShowForm(true);
          }}
          className="btn-primary w-full mb-4"
        >
          + Criar Meta
        </button>
      )}

      {/* Goals list */}
      {isLoading ? (
        <LoadingSpinner />
      ) : goals.length === 0 ? (
        <p style={{ color: "#A09880", textAlign: "center" }}>Nenhuma meta criada</p>
      ) : (
        goals.map((goal) => {
          const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const color = goalCategoryColors[goal.category] || "#A09880";
          return (
            <div key={goal.id} className="section-card mb-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold" style={{ color: "#1A2744" }}>
                    {goalCategoryIcons[goal.category]} {goal.name}
                  </p>
                  {goal.description && <p className="text-xs" style={{ color: "#A09880" }}>{goal.description}</p>}
                </div>
                <button
                  onClick={() => deleteMut.mutate({ id: goal.id })}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1" style={{ color: "#A09880" }}>
                  <span>{fmt(goal.currentAmount)}</span>
                  <span>{fmt(goal.targetAmount)}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#E8E0D0" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                  />
                </div>
              </div>

              {/* Deposit section */}
              {!goal.completed && depositingId === goal.id ? (
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="Valor R$"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="input-field flex-1 text-sm"
                  />
                  <button
                    onClick={() => handleDeposit(goal.id)}
                    disabled={depositMut.isPending}
                    className="btn-primary text-sm"
                  >
                    {depositMut.isPending ? "..." : "✓"}
                  </button>
                  <button
                    onClick={() => { setDepositingId(null); setDepositAmount(""); }}
                    className="btn-secondary text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 text-xs">
                  {!goal.completed && (
                    <button
                      onClick={() => setDepositingId(goal.id)}
                      className="btn-primary flex-1"
                    >
                      Depositar
                    </button>
                  )}
                  <button
                    onClick={() => toggleMut.mutate({ id: goal.id, completed: !goal.completed })}
                    className={`flex-1 px-2 py-1 rounded-lg border ${goal.completed ? "bg-green-100 border-green-300" : "bg-gray-100 border-gray-300"}`}
                  >
                    {goal.completed ? "✓ Concluída" : "Marcar Concluída"}
                  </button>
                </div>
              )}

              {goal.dueDate && (
                <p className="text-xs mt-2" style={{ color: "#A09880" }}>
                  Prazo: {new Date(goal.dueDate).toLocaleDateString("pt-BR")}
                </p>
              )}

              {goal.completed && (
                <p className="text-xs mt-2 font-semibold" style={{ color: "#27AE60" }}>
                  ✓ Meta concluída em {fmt(goal.currentAmount)}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
