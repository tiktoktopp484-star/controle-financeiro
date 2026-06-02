import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Props = {
  onClose: () => void;
};

export default function AdminPanel({ onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const { data: users = [], isLoading } = trpc.admin.listUsers.useQuery();
  const activateMut = trpc.admin.activateUserPremium.useMutation({
    onSuccess: (data) => {
      toast.success(`Premium ativado para ${data.email}!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const usersWithPendingReceipt = users.filter((u) => u.paymentReceiptUrl && !u.premium);
  const hasPending = usersWithPendingReceipt.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "#F8F3E8" }}
      >
        <div
          className="sticky top-0 z-10 rounded-t-2xl px-6 py-5"
          style={{
            background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.1)", color: "#E2C47A" }}
          >
            ✕
          </button>
          <h2
            className="text-2xl font-bold text-center"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "#E2C47A" }}
          >
            🔧 Admin
          </h2>
          <p className="text-center text-xs mt-1" style={{ color: "rgba(226,196,122,0.7)" }}>
            Gerenciar usuários — ativar Premium
          </p>
          {hasPending && (
            <div className="text-center mt-2">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "#C0392B", color: "#fff" }}>
                {usersWithPendingReceipt.length} comprovante(s) pendente(s)
              </span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 rounded-xl text-sm"
            style={{ background: "white", border: "1px solid #E8E0D0", color: "#1A2744" }}
          />

          {isLoading ? (
            <p className="text-xs text-center py-8" style={{ color: "#A09880" }}>
              Carregando...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "#A09880" }}>
              Nenhum usuário encontrado.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl p-3 flex items-center justify-between gap-2"
                  style={{ background: "white", border: "1px solid #E8E0D0" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: "#1A2744" }}>
                      {user.name || "Sem nome"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "#6B6350" }}>
                      {user.email}
                    </p>
                    {user.premium && (
                      <span
                        className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: "#C9A84C", color: "#1A2744" }}
                      >
                        ✦ PREMIUM
                      </span>
                    )}
                    {user.role === "admin" && (
                      <span
                        className="inline-block mt-1 ml-1 px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: "rgba(26,39,68,0.1)", color: "#3D4F7C" }}
                      >
                        ADMIN
                      </span>
                    )}
                    {user.paymentReceiptUrl && !user.premium && (
                      <span
                        className="inline-block mt-1 ml-1 px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: "#C0392B", color: "#fff" }}
                      >
                        📎 COMPROVANTE
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex gap-1">
                    {user.paymentReceiptUrl && (
                      <button
                        onClick={() => setSelectedReceipt(user.paymentReceiptUrl!)}
                        className="px-2 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                        style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}
                        title="Ver comprovante"
                      >
                        📎
                      </button>
                    )}
                    {!user.premium && (
                      <button
                        onClick={() => activateMut.mutate({ email: user.email!, months: 1 })}
                        disabled={activateMut.isPending}
                        className="px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
                        style={{ background: "rgba(26,39,68,0.08)", color: "#3D4F7C", border: "1px dashed rgba(26,39,68,0.2)" }}
                      >
                        Ativar Premium
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipt Modal */}
        {selectedReceipt && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)" }}
            onClick={() => setSelectedReceipt(null)}
          >
            <div className="relative max-w-md max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10"
                style={{ background: "#C0392B", color: "#fff" }}
              >
                ✕
              </button>
              <img
                src={selectedReceipt}
                alt="Comprovante de pagamento"
                className="rounded-xl max-w-full max-h-[85vh]"
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
