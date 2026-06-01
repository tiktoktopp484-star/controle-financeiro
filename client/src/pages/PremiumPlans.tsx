import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const PREMIUM_FEATURES = [
  { icon: "🌙", name: "Modo Escuro", desc: "Interface com tema escuro para mais conforto visual" },
  { icon: "📊", name: "Gráficos Avançados", desc: "Despesas por categoria, evolução mensal e visão anual" },
  { icon: "📈", name: "Projeção Financeira", desc: "Previsão de saldo para os próximos 6 meses" },
  { icon: "💰", name: "Orçamento Mensal", desc: "Defina limites por categoria e acompanhe o progresso" },
  { icon: "🏷️", name: "Categorias Personalizadas", desc: "Crie suas próprias categorias de despesa" },
  { icon: "📥", name: "Exportar Dados (CSV)", desc: "Baixe relatórios completos em CSV" },
  { icon: "🎯", name: "Metas Ilimitadas", desc: "Crie quantas metas de poupança quiser" },
  { icon: "🔔", name: "Alertas de Vencimento", desc: "Notificações de dívidas a vencer nos próximos 7 dias" },
  { icon: "📎", name: "Anexar Comprovantes", desc: "Adicione fotos dos comprovantes nas despesas" },
  { icon: "✦", name: "Badge Premium", desc: "Selo exclusivo de assinante premium" },
];

const FREE_FEATURES = [
  "Controle de despesas e receitas",
  "Gerenciamento de dívidas",
  "Cartões de crédito",
  "Metas (limite de 3)",
  "Categorias fixas (7 predefinidas)",
  "Calendário financeiro",
];

type Props = {
  onClose: () => void;
};

export default function PremiumPlans({ onClose }: Props) {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState<"plans" | "payment" | "success">("plans");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const manualActivateMut = trpc.premium.manualActivate.useMutation({
    onSuccess: () => {
      toast.success("Premium ativado! Aproveite todos os recursos.");
      refresh();
      setStep("success");
    },
    onError: (err) => toast.error(err.message),
  });

  const requestActivationMut = trpc.premium.requestActivation.useMutation({
    onSuccess: (data) => {
      if (data.notified) {
        toast.success("Administrador notificado! Aguarde a ativação.");
      } else {
        toast.error("WhatsApp não configurado. Avise o admin por outro meio.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const [adminEmail, setAdminEmail] = useState("");
  const [checkout, setCheckout] = useState<{ pixKey?: string; brCode?: string; qrCodeImage?: string; paymentLinkUrl?: string; value: number } | null>(null);

  const adminActivateMut = trpc.admin.activateUserPremium.useMutation({
    onSuccess: (data) => {
      toast.success(`Premium ativado para ${data.email}!`);
      setAdminEmail("");
    },
    onError: (err) => toast.error(err.message),
  });

  const checkoutMut = trpc.premium.checkout.useMutation({
    onSuccess: (data) => {
      setCheckout(data);
      setStep("payment");
      setProcessing(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setProcessing(false);
    },
  });

  const activateTrialMut = trpc.premium.activateTrial.useMutation({
    onSuccess: () => {
      toast.success("Teste grátis ativado! Aproveite o Premium por 1 dia.");
      refresh();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubscribe = () => {
    setProcessing(true);
    checkoutMut.mutate();
  };

  const handleTrial = () => {
    activateTrialMut.mutate();
  };

  const handleCopyPix = () => {
    const textToCopy = checkout?.brCode || checkout?.pixKey;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleBack = () => {
    setStep("plans");
    setCheckout(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "#F8F3E8" }}
      >
        {/* Header */}
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
            {step === "plans" ? "Planos" : step === "payment" ? "Pagamento" : "Parabéns!"}
          </h2>
          <p className="text-center text-xs mt-1" style={{ color: "rgba(226,196,122,0.7)" }}>
            {step === "plans" ? "Escolha o plano ideal para você" : ""}
          </p>
        </div>

        <div className="p-5 space-y-4">
          {step === "plans" && (
            <>
              {/* Free plan */}
              <div
                className="rounded-xl p-4"
                style={{ border: "1px solid rgba(201,168,76,0.2)", background: "white" }}
              >
                <h3 className="text-lg font-bold mb-1" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>
                  Grátis
                </h3>
                <p className="text-2xl font-bold mb-3" style={{ color: "#1A2744" }}>
                  R$ 0
                  <span className="text-sm font-normal" style={{ color: "#A09880" }}>/mês</span>
                </p>
                <ul className="space-y-1.5 mb-4">
                  {FREE_FEATURES.map(f => (
                    <li key={f} className="text-xs flex items-center gap-2" style={{ color: "#6B6350" }}>
                      <span style={{ color: "#2D7A4F" }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                {!user?.premium && (
                  <div
                    className="w-full py-3 rounded-xl text-sm font-bold text-center"
                    style={{ background: "rgba(26,39,68,0.05)", color: "#A09880" }}
                  >
                    Plano Atual
                  </div>
                )}
              </div>

              {/* Premium plan */}
              <div
                className="rounded-xl p-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
                  border: "1px solid rgba(201,168,76,0.3)",
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: "linear-gradient(90deg, transparent, #C9A84C, #E2C47A, #C9A84C, transparent)" }}
                />

                <div className="flex items-center justify-between mb-1 mt-1">
                  <h3 className="text-lg font-bold" style={{ color: "#E2C47A", fontFamily: "'Cormorant Garamond', serif" }}>
                    Premium
                  </h3>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ background: "#C9A84C", color: "#1A2744" }}
                  >
                    ★ RECOMENDADO
                  </span>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: "#E2C47A" }}>
                  R$ 19,90
                  <span className="text-sm font-normal" style={{ color: "rgba(226,196,122,0.6)" }}>/mês</span>
                </p>
                <p className="text-xs mb-3" style={{ color: "rgba(226,196,122,0.5)" }}>
                  Cancele quando quiser · Sem fidelidade
                </p>

                <ul className="space-y-2 mb-4">
                  {PREMIUM_FEATURES.map(f => (
                    <li key={f.name} className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{f.icon}</span>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "#E2C47A" }}>{f.name}</p>
                        <p className="text-xs" style={{ color: "rgba(226,196,122,0.6)" }}>{f.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {user?.premium ? (
                  <div
                    className="w-full py-3 rounded-xl text-sm font-bold text-center"
                    style={{ background: "rgba(226,196,122,0.15)", color: "#E2C47A", border: "1px solid rgba(226,196,122,0.3)" }}
                  >
                    ✦ Assinante Premium
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {!user?.trialUsed && (
                      <button
                        onClick={handleTrial}
                        disabled={activateTrialMut.isPending}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                        style={{
                          background: "transparent",
                          color: "#E2C47A",
                          border: "1px solid rgba(226,196,122,0.4)",
                        }}
                      >
                        {activateTrialMut.isPending ? "Ativando..." : "🎁 Teste Grátis 1 Dia"}
                      </button>
                    )}
                    <button
                      onClick={handleSubscribe}
                      disabled={processing}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                      style={{
                        background: "linear-gradient(135deg, #C9A84C 0%, #E2C47A 100%)",
                        color: "#1A2744",
                      }}
                    >
                      {processing ? "Carregando..." : "Assinar Premium"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {step === "payment" && checkout && (
            <div className="text-center space-y-4">
              <p className="text-lg font-bold" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>
                Pagamento via PIX
              </p>
              <p className="text-sm" style={{ color: "#6B6350" }}>
                Faça um PIX de <strong>R$ {checkout.value.toFixed(2)}</strong>
              </p>

              {checkout.qrCodeImage && (
                <div className="flex justify-center">
                  <img
                    src={checkout.qrCodeImage}
                    alt="QR Code PIX"
                    className="rounded-xl"
                    style={{ width: 200, height: 200 }}
                  />
                </div>
              )}

              <div
                className="rounded-xl p-4 text-sm break-all"
                style={{ background: "#F5F0E8", border: "1px solid #E8E0D0", color: "#1A2744" }}
              >
                {checkout.brCode || checkout.pixKey}
              </div>

              <button
                onClick={handleCopyPix}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
                  color: "#E2C47A",
                }}
              >
                {copied ? "✓ Copiado!" : "Copiar código PIX"}
              </button>

              {checkout.pixKey && (
                <p className="text-xs" style={{ color: "#A09880" }}>
                  Após enviar o PIX, clique abaixo para avisar o administrador.
                </p>
              )}

              {checkout.brCode && (
                <p className="text-xs" style={{ color: "#A09880" }}>
                  Após o pagamento, o Premium será ativado automaticamente em até 1 minuto.
                </p>
              )}

              {checkout?.pixKey && (
                <button
                  onClick={() => requestActivationMut.mutate()}
                  disabled={requestActivationMut.isPending}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                    color: "#fff",
                  }}
                >
                  {requestActivationMut.isPending ? "Enviando..." : "💬 Solicitar Ativação via WhatsApp"}
                </button>
              )}

              <button
                onClick={handleBack}
                className="w-full py-2 text-sm font-semibold"
                style={{ color: "#6B6350" }}
              >
                Voltar
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8">
              <p className="text-5xl mb-4">🎉</p>
              <p className="text-xl font-bold mb-2" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>
                Premium Ativado!
              </p>
              <p className="text-sm mb-6" style={{ color: "#6B6350" }}>
                Agora você tem acesso a todos os recursos premium. Aproveite!
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #C9A84C 0%, #E2C47A 100%)",
                  color: "#1A2744",
                }}
              >
                Começar a usar o Premium
              </button>
            </div>
          )}

          {step === "plans" && (user as any)?.isAdmin && (
            <div className="pt-3 mt-3 border-t space-y-3" style={{ borderColor: "rgba(201,168,76,0.2)" }}>
              <p className="text-xs font-bold text-center" style={{ color: "#1A2744" }}>
                🔧 ADMIN — Ativar Premium por email
              </p>
              <input
                type="email"
                placeholder="Digite o email do usuário"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full p-3 rounded-xl text-sm"
                style={{ background: "white", border: "1px solid #E8E0D0", color: "#1A2744" }}
              />
              <button
                onClick={() => adminActivateMut.mutate({ email: adminEmail, months: 1 })}
                disabled={adminActivateMut.isPending || !adminEmail}
                className="w-full py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "rgba(26,39,68,0.05)", color: "#3D4F7C", border: "1px dashed rgba(26,39,68,0.2)" }}
              >
                {adminActivateMut.isPending ? "Ativando..." : "Ativar Premium"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
