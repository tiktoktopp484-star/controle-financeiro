import { useState, type FormEvent } from "react";
import { isLoggedIn, login, register } from "@/lib/auth";
import { toast } from "sonner";

type Props = {
  onUnlock: () => void;
};

export default function LockScreen({ onUnlock }: Props) {
  const [tab, setTab] = useState<"login" | "register">(() => isLoggedIn() ? "login" : "register");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (tab === "register") {
      const r = await register(name, email, password);
      if (!r.ok) {
        toast.error(r.error);
        setLoading(false);
        return;
      }
      toast.success("Conta criada!");
      onUnlock();
      return;
    }

    const r = await login(email, password);
    if (!r.ok) {
      toast.error(r.error);
      setLoading(false);
      return;
    }
    toast.success(`Bem-vindo${r.name ? ", " + r.name : ""}!`);
    onUnlock();
  };

  return (
    <div className="min-h-screen flex items-center justify-center sacred-bg" style={{ minHeight: "100dvh" }}>
      <div className="w-full max-w-sm mx-4 animate-fade-in-up">
        <div className="h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, #C9A84C, #E2C47A, #C9A84C, transparent)" }} />
        <div className="bg-white rounded-b-2xl shadow-2xl px-8 py-10" style={{ boxShadow: "0 20px 60px rgba(26,39,68,0.15)" }}>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)" }}>
              <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
                <circle cx="20" cy="20" r="16" stroke="#C9A84C" strokeWidth="1" opacity="0.5" />
                <circle cx="20" cy="20" r="10" stroke="#E2C47A" strokeWidth="0.8" opacity="0.4" />
                <path d="M20 8 L28 14 L28 26 L20 32 L12 26 L12 14 Z" stroke="#C9A84C" strokeWidth="1" fill="none" opacity="0.6" />
                <text x="14" y="24" fontSize="14" fontWeight="700" fill="#E2C47A" fontFamily="serif">₢</text>
              </svg>
            </div>
          </div>

          <h1 className="text-center text-2xl font-bold mb-1" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1A2744" }}>
            Controle Financeiro
          </h1>
          <p className="text-center text-xs mb-8 tracking-widest uppercase" style={{ color: "#C9A84C", letterSpacing: "0.15em" }}>
            {tab === "login" ? "Faça login" : "Crie sua conta"}
          </p>

          <div className="flex mb-6 rounded-xl overflow-hidden border" style={{ borderColor: "rgba(201,168,76,0.3)" }}>
            <button
              onClick={() => setTab("login")}
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: tab === "login" ? "#1A2744" : "transparent",
                color: tab === "login" ? "#E2C47A" : "#6B6350",
              }}
            >
              Entrar
            </button>
            <button
              onClick={() => setTab("register")}
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: tab === "register" ? "#1A2744" : "transparent",
                color: tab === "register" ? "#E2C47A" : "#6B6350",
              }}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "#6B6350" }}>Nome</label>
                <input
                  type="text" placeholder="Seu nome" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#6B6350" }}>Email</label>
              <input
                type="email" placeholder="seu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#6B6350" }}>Senha</label>
              <input
                type="password" placeholder="Mínimo 4 caracteres" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                autoComplete={tab === "register" ? "new-password" : "current-password"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="spinner inline-block w-5 h-5 border-2 border-white/30 border-t-white" />
              ) : tab === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "#A09880" }}>
            {tab === "login" ? "Ainda não tem conta? Clique em Cadastrar" : "Já tem conta? Clique em Entrar"}
          </p>
        </div>
      </div>
    </div>
  );
}
