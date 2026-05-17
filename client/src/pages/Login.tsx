import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";

type Mode = "login" | "register";

export default function Login() {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const loginMut = trpc.auth.login.useMutation({
    onSuccess: () => {
      refresh();
    },
    onError: (err) => {
      if (err instanceof TRPCClientError) {
        toast.error(err.message);
      } else {
        toast.error("Erro ao fazer login");
      }
    },
  });

  const registerMut = trpc.auth.register.useMutation({
    onSuccess: () => {
      refresh();
    },
    onError: (err) => {
      if (err instanceof TRPCClientError) {
        toast.error(err.message);
      } else {
        toast.error("Erro ao cadastrar");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMut.mutate({ email, password });
    } else {
      registerMut.mutate({ email, password, name });
    }
  };

  const isPending = loginMut.isPending || registerMut.isPending;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 sacred-bg"
      style={{ minHeight: "100dvh" }}
    >
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

      <div className="relative w-full max-w-sm animate-fade-in-up">
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

          <p
            className="text-center text-sm mb-8 tracking-widest uppercase"
            style={{ color: "#C9A84C", fontFamily: "'Inter', sans-serif", fontWeight: 500, letterSpacing: "0.15em" }}
          >
            Gestão com Precisão Áurea
          </p>

          <div
            className="h-px mb-6"
            style={{ background: "linear-gradient(90deg, transparent, #E2C47A, transparent)" }}
          />

          {/* Mode toggle */}
          <div className="flex mb-6 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.3)" }}>
            <button
              onClick={() => setMode("login")}
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: mode === "login" ? "#1A2744" : "transparent",
                color: mode === "login" ? "#E2C47A" : "#6B6350",
              }}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("register")}
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={{
                background: mode === "register" ? "#1A2744" : "transparent",
                color: mode === "register" ? "#E2C47A" : "#6B6350",
              }}
            >
              Cadastrar
            </button>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "register" && (
                <input
                  type="text"
                  placeholder="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: "rgba(26,39,68,0.04)",
                    color: "#1A2744",
                    border: "1px solid rgba(201,168,76,0.25)",
                  }}
                />
              )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: "rgba(26,39,68,0.04)",
                color: "#1A2744",
                border: "1px solid rgba(201,168,76,0.25)",
              }}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 6 : 1}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: "rgba(26,39,68,0.04)",
                color: "#1A2744",
                border: "1px solid rgba(201,168,76,0.25)",
              }}
            />

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 active:scale-95 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
                color: "#E2C47A",
                boxShadow: "0 4px 16px rgba(26,39,68,0.25)",
                border: "1px solid rgba(201,168,76,0.3)",
              }}
            >
              {isPending ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          <p
            className="text-center text-xs mt-6"
            style={{ color: "#A09880", fontFamily: "'Inter', sans-serif" }}
          >
            Seus dados são privados e protegidos
          </p>
        </div>

        <div
          className="h-px mt-8 mx-8"
          style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)" }}
        />

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
