import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Despesas() {
  const { user } = useAuth();
  const [selCat, setSelCat] = useState("Outros");
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [searchTerm, setSearchTerm] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: expenses = [], isLoading } = trpc.expenses.list.useQuery();
  const { data: customCats = [] } = trpc.customCategories.list.useQuery(undefined, { enabled: !!user?.premium });

  const allCats = user?.premium && customCats.length > 0
    ? [...CATEGORIES, ...customCats.map((c: { name: string }) => ({ key: c.name, emoji: "📌" as const, color: "#C9A84C" as const }))]
    : CATEGORIES;

  const addCatMut = trpc.customCategories.add.useMutation({
    onSuccess: () => {
      utils.customCategories.list.invalidate();
      toast.success("Categoria personalizada criada!");
    },
    onError: () => toast.error("Erro ao criar categoria"),
  });

  const [newCatName, setNewCatName] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);

  const addMut = trpc.expenses.add.useMutation({
    onSuccess: (data) => {
      utils.expenses.list.invalidate();
      if (receiptFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          uploadReceiptMut.mutate({ expenseId: data.id, imageBase64: base64 });
        };
        reader.readAsDataURL(receiptFile);
      }
      setDesc(""); setVal(""); setReceiptFile(null); setReceiptPreview(null); setIsRecurring(false); setRecurringInterval("monthly");
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

  const uploadReceiptMut = trpc.expenses.uploadReceipt.useMutation({
    onError: () => toast.error("Erro ao enviar comprovante"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
      toast.error("Apenas imagens (PNG, JPG, GIF, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (max 5MB)");
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    const v = parseFloat(val);
    if (!desc.trim() || !v || v <= 0) { toast.error("Preencha todos os campos"); return; }

    addMut.mutate(
      {
        description: desc.trim(),
        value: v,
        category: selCat,
        date,
        recurring: isRecurring,
        recurringInterval: isRecurring ? recurringInterval : undefined,
        nextRecurringDate: isRecurring ? date : undefined,
      },
    );
  };

  const catColor = (cat: string) => allCats.find((c: { key: string; color: string }) => c.key === cat)?.color ?? "#7F8C8D";

  return (
    <div>
      {/* Form */}
      <div className="section-card">
        <p className="text-sm font-semibold mb-3" style={{ color: "#1A2744" }}>Categoria</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {allCats.map((c) => (
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
          {user?.premium && !showNewCat && (
            <button
              onClick={() => setShowNewCat(true)}
              className="cat-pill"
              style={{ background: "transparent", border: "1px dashed #C9A84C", color: "#C9A84C" }}
            >
              + Nova
            </button>
          )}
          {showNewCat && (
            <div className="flex gap-1 w-full mt-1">
              <input
                className="fin-input flex-1 text-sm"
                placeholder="Nome da categoria"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <button
                onClick={() => {
                  if (!newCatName.trim()) { toast.error("Digite um nome"); return; }
                  addCatMut.mutate({ name: newCatName.trim() });
                  setNewCatName("");
                  setShowNewCat(false);
                }}
                disabled={addCatMut.isPending}
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "#1A2744", color: "#E2C47A" }}
              >
                Criar
              </button>
              <button
                onClick={() => { setShowNewCat(false); setNewCatName(""); }}
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background: "#F5F0E8", color: "#6B6350" }}
              >
                ✕
              </button>
            </div>
          )}
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

        {/* Recurring toggle */}
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded"
            />
            <span className="text-xs font-medium" style={{ color: "#6B6350" }}>Despesa recorrente</span>
          </label>
          {isRecurring && (
            <select
              value={recurringInterval}
              onChange={(e) => setRecurringInterval(e.target.value as "weekly" | "monthly" | "yearly")}
              className="fin-input text-xs flex-1"
            >
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="yearly">Anual</option>
            </select>
          )}
        </div>

        {/* Receipt upload */}
        {user?.premium && (
          <div className="mb-2">
            <div
              className="fin-input flex items-center gap-2 cursor-pointer"
              onClick={() => fileRef.current?.click()}
              style={{ padding: "8px 12px", minHeight: 42 }}
            >
              <span style={{ color: "#C9A84C" }}>📎</span>
              <span className="text-sm flex-1" style={{ color: receiptFile ? "#1A2744" : "#A09880" }}>
                {receiptFile ? receiptFile.name : "Anexar comprovante (opcional)"}
              </span>
              {receiptPreview && (
                <img
                  src={receiptPreview}
                  alt="preview"
                  className="rounded"
                  style={{ width: 32, height: 32, objectFit: "cover" }}
                />
              )}
              {receiptFile && (
                <button
                  onClick={(e) => { e.stopPropagation(); setReceiptFile(null); setReceiptPreview(null); }}
                  className="text-xs"
                  style={{ color: "#C0392B" }}
                >
                  ✕
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={addMut.isPending}
          className="w-full py-3 rounded-xl font-semibold text-base mt-2 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: "#C0392B", color: "#fff" }}
        >
          {addMut.isPending ? "Adicionando..." : (receiptFile ? "📎 " : "") + "Adicionar Despesa"}
        </button>
      </div>

      {/* List */}
      <div className="section-card">
        {/* Search */}
        <div className="mb-3">
          <input
            className="fin-input w-full text-sm"
            placeholder="🔍 Buscar despesas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
            {expenses.filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase())).map((e) => (
              <div key={e.id} className="item-row">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: catColor(e.category ?? "Outros") }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>{e.description}</p>
                    <p className="text-xs" style={{ color: "#A09880" }}>
                      {e.category} · {e.date}
                      {e.recurring && <span className="ml-1 text-xs" style={{ color: "#8E44AD" }}>🔄</span>}
                      {e.receiptUrl && <span className="ml-2 cursor-pointer" style={{ color: "#C9A84C" }} onClick={() => setSelectedReceipt(e.receiptUrl)}>📎</span>}
                    </p>
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

      {/* Receipt modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className="relative max-w-lg max-h-[80vh] rounded-xl overflow-hidden"
            style={{ background: "#F8F3E8" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10"
              style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
            >
              ✕
            </button>
            <img
              src={selectedReceipt}
              alt="Comprovante"
              className="max-w-full max-h-[75vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
