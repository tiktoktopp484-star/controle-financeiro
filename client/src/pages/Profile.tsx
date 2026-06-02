import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Profile({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isEditing, setIsEditing] = useState(false);

  const updateMut = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      setIsEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    updateMut.mutate({ name: name.trim(), email: email.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ maxWidth: 380 }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>Meu Perfil</h3>
        
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 tracking-wider" style={{ color: "#6B6350" }}>NOME</label>
            <input
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "#F5F0E8", color: "#1A2744", border: "1px solid #E8E0D0" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 tracking-wider" style={{ color: "#6B6350" }}>EMAIL</label>
            <input
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "#F5F0E8", color: "#1A2744", border: "1px solid #E8E0D0" }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setName(user?.name || ""); setEmail(user?.email || ""); }} 
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "#F5F0E8", color: "#6B6350", border: "1px solid #E8E0D0" }}>Cancelar</button>
              <button onClick={handleSave} disabled={updateMut.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #1A2744, #243460)", color: "#E2C47A" }}>
                {updateMut.isPending ? "Salvando..." : "Salvar"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E2C47A)", color: "#1A2744" }}>Editar</button>
              <button onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "#F5F0E8", color: "#6B6350", border: "1px solid #E8E0D0" }}>Fechar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
