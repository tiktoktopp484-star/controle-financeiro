import { getLoginUrl } from "@/const";

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = getLoginUrl();
  };

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
            Gestão com Precisão Áurea
          </p>

          {/* Gold divider */}
          <div
            className="h-px mb-8"
            style={{ background: "linear-gradient(90deg, transparent, #E2C47A, transparent)" }}
          />

          {/* Description */}
          <p
            className="text-center text-sm mb-8 leading-relaxed"
            style={{ color: "#6B6350", fontFamily: "'Inter', sans-serif" }}
          >
            Gerencie suas finanças pessoais com elegância e precisão. Controle despesas, receitas, dívidas e cartões em um só lugar.
          </p>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
              color: "#E2C47A",
              boxShadow: "0 4px 16px rgba(26,39,68,0.25)",
              fontFamily: "'Inter', sans-serif",
              border: "1px solid rgba(201,168,76,0.3)",
            }}
          >
            {/* Google icon */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#E2C47A"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#C9A84C"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#9E7A2E"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#E2C47A"
              />
            </svg>
            Entrar com Google
          </button>

          {/* Security note */}
          <p
            className="text-center text-xs mt-6"
            style={{ color: "#A09880", fontFamily: "'Inter', sans-serif" }}
          >
            🔒 Acesso seguro via OAuth 2.0 · Seus dados são privados
          </p>
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
