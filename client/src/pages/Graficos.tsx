import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: "#E74C3C",
  Transporte: "#2980B9",
  Saúde: "#27AE60",
  Lazer: "#8E44AD",
  Educação: "#E67E22",
  Casa: "#16A085",
  Outros: "#7F8C8D",
};

type Props = {
  onOpenPremium?: () => void;
};

export default function Graficos({ onOpenPremium }: Props) {
  const { user } = useAuth();

  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: salaries = [] } = trpc.salaries.list.useQuery();
  const { data: incomes = [] } = trpc.incomes.list.useQuery();
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    if (!drillCategory) return [];
    return expenses.filter(e => (e.category ?? "Outros") === drillCategory);
  }, [drillCategory, expenses]);

  if (!user?.premium) {
    return (
      <div className="section-card text-center py-8">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-lg font-bold mb-2" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>
          Gráficos Avançados
        </p>
        <p className="text-sm mb-4" style={{ color: "#6B6350" }}>
          Este recurso é exclusivo para assinantes premium
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

  const expensesByCat: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category ?? "Outros";
    expensesByCat[cat] = (expensesByCat[cat] || 0) + e.value;
  });

  const pieData = Object.entries(expensesByCat).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));

  const totalSalary = salaries.reduce((s, sal) => s + sal.value, 0);
  const totalIncome = totalSalary + incomes.reduce((s, i) => s + i.value, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.value, 0);

  const monthlyMap: Record<string, { income: number; expense: number }> = {};
  [...salaries, ...incomes].forEach((i) => {
    const m = (i.date ?? "").substring(0, 7);
    if (m) {
      if (!monthlyMap[m]) monthlyMap[m] = { income: 0, expense: 0 };
      monthlyMap[m].income += i.value;
    }
  });
  expenses.forEach((e) => {
    const m = (e.date ?? "").substring(0, 7);
    if (m) {
      if (!monthlyMap[m]) monthlyMap[m] = { income: 0, expense: 0 };
      monthlyMap[m].expense += e.value;
    }
  });

  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
    }));

  const now = new Date();
  const forecastData = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap[m];
    forecastData.push({
      month: m,
      income: existing?.income ?? totalIncome,
      expense: existing?.expense ?? totalExpense,
      projected: true,
    });
  }

  return (
    <div>
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
          Despesas por Categoria
        </p>
        {pieData.length === 0 ? (
          <div className="empty-state">Nenhuma despesa registrada</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} onClick={(entry) => setDrillCategory(entry.name)} style={{ cursor: "pointer" }}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#7F8C8D"} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {drillCategory && (
        <button onClick={() => setDrillCategory(null)}
          className="text-sm font-semibold mb-2" style={{ color: "#C9A84C" }}>
          ← Voltar
        </button>
      )}

      {drillCategory && (
        <div className="section-card mt-3">
          <p className="text-sm font-semibold mb-2" style={{ color: "#1A2744" }}>
            Despesas em {drillCategory}
          </p>
          {filteredExpenses.length === 0 ? (
            <p className="text-xs" style={{ color: "#A09880" }}>Nenhuma despesa nesta categoria</p>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredExpenses.map(e => (
                <div key={e.id} className="flex justify-between items-center py-1">
                  <span className="text-xs" style={{ color: "#1A2744" }}>{e.description}</span>
                  <span className="text-xs font-bold" style={{ color: "#C0392B" }}>
                    {e.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
          Evolução Mensal (Receitas vs Despesas)
        </p>
        {monthlyData.length === 0 ? (
          <div className="empty-state">Sem dados suficientes</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="income" name="Receitas" fill="#2D7A4F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Despesas" fill="#C0392B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>
          Projeção Financeira (6 meses)
        </p>
        {forecastData.length === 0 ? (
          <div className="empty-state">Sem dados suficientes</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="income" name="Receitas" stroke="#2D7A4F" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="expense" name="Despesas" stroke="#C0392B" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
