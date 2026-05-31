import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Props = {
  onClose: () => void;
};

export default function AdminPanel({ onClose }: Props) {
  const [search, setSearch] = useState("");

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
                  </div>
                  {!user.premium && (
                    <button
                      onClick={() => activateMut.mutate({ email: user.email!, months: 1 })}
                      disabled={activateMut.isPending}
                      className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: "rgba(26,39,68,0.08)", color: "#3D4F7C", border: "1px dashed rgba(26,39,68,0.2)" }}
                    >
                      Ativar Premium
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
