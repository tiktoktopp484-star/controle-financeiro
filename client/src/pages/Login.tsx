import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Mode = "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const utils = trpc.useUtils();

  const loginMut = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data as any);
      toast.success("Login realizado!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const registerMut = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data as any);
      toast.success("Conta criada com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMut.mutate({ email, password });
    } else {
      registerMut.mutate({ name, email, password });
    }
  };

  const isPending = loginMut.isPending || registerMut.isPending;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 sacred-bg"
      style={{ minHeight: "100dvh" }}
    >
      {/* Sacred geometry decorative circles */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 400 400"
          className="absolute -top-20 -right-20 w-80 h-80 opacity-10"
          fill="none"
          stroke="#C9A84C"
          strokeWidth="0.8"
        >
          <circle cx="200" cy="200" r="180" />
          <circle cx="200" cy="200" r="140" />
          <circle cx="200" cy="200" r="100" />
          <circle cx="200" cy="200" r="60" />
          <circle cx="110" cy="200" r="90" />
          <circle cx="290" cy="200" r="90" />
          <circle cx="155" cy="122" r="90" />
          <circle cx="245" cy="122" r="90" />
          <circle cx="155" cy="278" r="90" />
          <circle cx="245" cy="278" r="90" />
        </svg>
        <svg
          viewBox="0 0 300 300"
          className="absolute -bottom-16 -left-16 w-64 h-64 opacity-8"
          fill="none"
          stroke="#C9A84C"
          strokeWidth="0.6"
        >
          <circle cx="150" cy="150" r="130" />
          <circle cx="150" cy="150" r="90" />
          <circle cx="150" cy="150" r="50" />
          <circle cx="80" cy="150" r="70" />
          <circle cx="220" cy="150" r="70" />
        </svg>
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-sm animate-fade-in-up">
        {/* Golden top accent */}
        <div
          className="h-1 rounded-t-2xl"
          style={{
            background: "linear-gradient(90deg, transparent, #C9A84C, #E2C47A, #C9A84C, transparent)",
          }}
        />

        <div
          className="bg-white rounded-b-2xl shadow-2xl px-8 py-10"
          style={{ boxShadow: "0 20px 60px rgba(26,39,68,0.15), 0 4px 16px rgba(201,168,76,0.1)" }}
        >
          {/* Logo / Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)" }}
            >
              <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
                <circle cx="20" cy="20" r="16" stroke="#C9A84C" strokeWidth="1" opacity="0.5" />
                <circle cx="20" cy="20" r="10" stroke="#E2C47A" strokeWidth="0.8" opacity="0.4" />
                <path
                  d="M20 8 L28 14 L28 26 L20 32 L12 26 L12 14 Z"
                  stroke="#C9A84C"
                  strokeWidth="1"
                  fill="none"
                  opacity="0.6"
                />
                <text x="14" y="24" fontSize="14" fontWeight="700" fill="#E2C47A" fontFamily="serif">
                  ₢
                </text>
              </svg>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-2">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: "#1A2744",
                letterSpacing: "-0.02em",
              }}
            >
              Controle Financeiro
            </h1>
          </div>

          {/* Gold subtitle */}
          <p
            className="text-center text-sm mb-8 tracking-widest uppercase"
            style={{ color: "#C9A84C", fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: "0.15em" }}
          >
            {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
          </p>

          {/* Gold divider */}
          <div
            className="h-px mb-8"
            style={{ background: "linear-gradient(90deg, transparent, #E2C47A, transparent)" }}
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 tracking-wider" style={{ color: "#6B6350" }}>
                  NOME
                </label>
                <input
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: "#F5F0E8",
                    color: "#1A2744",
                    border: "1px solid #E8E0D0",
                  }}
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wider" style={{ color: "#6B6350" }}>
                EMAIL
              </label>
              <input
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "#F5F0E8",
                  color: "#1A2744",
                  border: "1px solid #E8E0D0",
                }}
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wider" style={{ color: "#6B6350" }}>
                SENHA
              </label>
              <input
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "#F5F0E8",
                  color: "#1A2744",
                  border: "1px solid #E8E0D0",
                }}
                type="password"
                placeholder={mode === "register" ? "Mínimo 4 caracteres" : "Sua senha"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={4}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 active:scale-95 disabled:opacity-60 mt-2"
              style={{
                background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
                color: "#E2C47A",
                boxShadow: "0 4px 16px rgba(26,39,68,0.25)",
                fontFamily: "'Inter', sans-serif",
                border: "1px solid rgba(201,168,76,0.3)",
              }}
            >
              {isPending ? "..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setName("");
              }}
              className="text-sm font-medium transition-all hover:opacity-70"
              style={{ color: "#C9A84C", fontFamily: "'Inter', sans-serif" }}
            >
              {mode === "login"
                ? "Não tem conta? Cadastre-se"
                : "Já tem conta? Faça login"}
            </button>
          </div>
        </div>

        {/* Bottom golden accent */}
        <div
          className="h-px mt-8 mx-8"
          style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)" }}
        />

        {/* Footer tagline */}
        <p
          className="text-center text-xs mt-4"
          style={{
            color: "rgba(26,39,68,0.4)",
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            letterSpacing: "0.05em",
          }}
        >
          Proporção Áurea · Harmonia Financeira
        </p>
      </div>
    </div>
  );
}
