import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSearchParams } from "wouter";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  const mut = trpc.auth.resetPasswordConfirm.useMutation({
    onSuccess: () => { toast.success("Senha alterada!"); setDone(true); },
    onError: (e) => toast.error(e.message),
  });

  if (!token) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Link inválido.</div>;
  if (done) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Senha alterada! <a href="/" style={{ color: "#C9A84C", marginLeft: 4 }}>Fazer login</a></div>;

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F8F3E8" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm" style={{ boxShadow: "0 20px 60px rgba(26,39,68,0.15)" }}>
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>Redefinir Senha</h1>
        <p className="text-center text-sm mb-6" style={{ color: "#6B6350" }}>Digite sua nova senha.</p>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate({ token, newPassword: password }); }} className="flex flex-col gap-4">
          <input
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: "#F5F0E8", color: "#1A2744", border: "1px solid #E8E0D0" }}
            type="password" placeholder="Nova senha (mínimo 4 caracteres)" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={4} required
          />
          <button
            type="submit" disabled={mut.isPending || password.length < 4}
            className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)", color: "#E2C47A" }}
          >
            {mut.isPending ? "..." : "Redefinir Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
