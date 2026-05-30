import { useState, useEffect } from "react";
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

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

function PixPayment({ checkout, onBack }: { checkout: { pixQrCode: { encodedImage: string; payload: string } | null }; onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (checkout.pixQrCode?.payload) {
      navigator.clipboard.writeText(checkout.pixQrCode.payload);
      setCopied(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="text-center">
      <p className="text-lg font-bold mb-2" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>
        Pagamento via Pix
      </p>
      <p className="text-xs mb-4" style={{ color: "#6B6350" }}>
        Escaneie o QR Code ou copie o código Pix
      </p>
      {checkout.pixQrCode?.encodedImage && (
        <div className="flex justify-center mb-4">
          <img
            src={`data:image/png;base64,${checkout.pixQrCode.encodedImage}`}
            alt="QR Code Pix"
            className="rounded-xl"
            style={{ width: 200, height: 200 }}
          />
        </div>
      )}
      {checkout.pixQrCode?.payload && (
        <div className="mb-4">
          <div
            className="rounded-xl p-3 text-xs break-all mb-2"
            style={{ background: "#F5F0E8", border: "1px solid #E8E0D0", color: "#6B6350" }}
          >
            {checkout.pixQrCode.payload}
          </div>
          <button
            onClick={handleCopy}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
              color: "#E2C47A",
            }}
          >
            {copied ? "✓ Copiado!" : "Copiar código Pix"}
          </button>
        </div>
      )}
      <p className="text-xs" style={{ color: "#A09880" }}>
        Após o pagamento, o Premium será ativado automaticamente em até 2 minutos
      </p>

      <div className="pt-3 mt-3 border-t" style={{ borderColor: "rgba(201,168,76,0.2)" }}>
        <button
          onClick={onBack}
          className="text-sm font-semibold"
          style={{ color: "#6B6350" }}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

function BoletoPayment({ checkout, onBack }: { checkout: { bankSlipUrl: string | null; invoiceUrl: string | null }; onBack: () => void }) {
  const url = checkout.bankSlipUrl || checkout.invoiceUrl;
  return (
    <div className="text-center">
      <p className="text-lg font-bold mb-2" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>
        Boleto Bancário
      </p>
      <p className="text-xs mb-6" style={{ color: "#6B6350" }}>
        Clique no botão abaixo para visualizar e pagar o boleto
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 rounded-xl text-sm font-bold text-center transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #1A2744 0%, #243460 100%)",
            color: "#E2C47A",
          }}
        >
          Visualizar Boleto
        </a>
      ) : (
        <p className="text-sm" style={{ color: "#C0392B" }}>Erro ao gerar boleto. Tente Pix.</p>
      )}
      <button
        onClick={onBack}
        className="mt-4 text-sm font-semibold"
        style={{ color: "#6B6350" }}
      >
        Voltar
      </button>
    </div>
  );
}

type CheckoutData = {
  subscriptionId: string;
  paymentId: string | null;
  billingType: string;
  status: string;
  pixQrCode: { encodedImage: string; payload: string } | null;
  bankSlipUrl: string | null;
  invoiceUrl: string | null;
  value: number;
};

export default function PremiumPlans({ onClose }: Props) {
  const { user, refresh } = useAuth();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [step, setStep] = useState<"plans" | "payment" | "success">("plans");
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<BillingType | null>(null);

  const manualActivateMut = trpc.premium.manualActivate.useMutation({
    onSuccess: () => {
      toast.success("Premium ativado! Aproveite todos os recursos.");
      refresh();
      setStep("success");
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMut = trpc.premium.cancel.useMutation({
    onSuccess: () => {
      toast.success("Assinatura cancelada");
      refresh();
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

  const handleSubscribe = (billingType: BillingType) => {
    setPaymentMethod(billingType);
    setProcessing(true);
    checkoutMut.mutate({ billingType });
  };

  const handleTrial = () => {
    activateTrialMut.mutate();
  };

  const handleBack = () => {
    setStep("plans");
    setCheckout(null);
    setPaymentMethod(null);
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
                      onClick={() => setStep("payment")}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, #C9A84C 0%, #E2C47A 100%)",
                        color: "#1A2744",
                      }}
                    >
                      Assinar Premium
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {step === "payment" && !checkout && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-center mb-4" style={{ color: "#1A2744" }}>
                Escolha a forma de pagamento
              </p>
              <button
                onClick={() => handleSubscribe("PIX")}
                disabled={processing}
                className="w-full p-4 rounded-xl text-left flex items-center gap-3 transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "white", border: "1px solid rgba(201,168,76,0.2)" }}
              >
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1A2744" }}>Pix</p>
                  <p className="text-xs" style={{ color: "#A09880" }}>Pagamento instantâneo</p>
                </div>
                <span className="ml-auto text-xs font-semibold" style={{ color: "#2D7A4F" }}>✓ Aprovação na hora</span>
              </button>
              <button
                onClick={() => handleSubscribe("BOLETO")}
                disabled={processing}
                className="w-full p-4 rounded-xl text-left flex items-center gap-3 transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "white", border: "1px solid rgba(201,168,76,0.2)" }}
              >
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1A2744" }}>Boleto Bancário</p>
                  <p className="text-xs" style={{ color: "#A09880" }}>Vencimento em 3 dias úteis</p>
                </div>
              </button>
              <button
                onClick={() => handleSubscribe("CREDIT_CARD")}
                disabled={processing}
                className="w-full p-4 rounded-xl text-left flex items-center gap-3 transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "white", border: "1px solid rgba(201,168,76,0.2)" }}
              >
                <span className="text-2xl">💳</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1A2744" }}>Cartão de Crédito</p>
                  <p className="text-xs" style={{ color: "#A09880" }}>Pagamento recorrente mensal</p>
                </div>
              </button>
              {processing && (
                <div className="text-center py-4">
                  <div className="spinner mx-auto mb-2" />
                  <p className="text-xs" style={{ color: "#A09880" }}>Processando...</p>
                </div>
              )}

              <div className="pt-2 border-t" style={{ borderColor: "rgba(201,168,76,0.2)" }}>
                <p className="text-xs text-center mb-2" style={{ color: "#A09880" }}>
                  🧪 Modo de teste — ative manualmente:
                </p>
                <button
                  onClick={() => manualActivateMut.mutate()}
                  disabled={manualActivateMut.isPending}
                  className="w-full py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: "rgba(26,39,68,0.05)", color: "#3D4F7C", border: "1px dashed rgba(26,39,68,0.2)" }}
                >
                  {manualActivateMut.isPending ? "Ativando..." : "🔓 Ativar Premium Manualmente (teste)"}
                </button>
              </div>

              <button
                onClick={handleBack}
                className="w-full py-2 text-sm font-semibold"
                style={{ color: "#6B6350" }}
              >
                Voltar
              </button>
            </div>
          )}

          {step === "payment" && checkout && paymentMethod === "PIX" && (
            <PixPayment checkout={checkout} onBack={handleBack} />
          )}

          {step === "payment" && checkout && paymentMethod === "BOLETO" && (
            <BoletoPayment checkout={checkout} onBack={handleBack} />
          )}

          {step === "payment" && checkout && paymentMethod === "CREDIT_CARD" && (
            <div className="text-center">
              <p className="text-lg font-bold mb-2" style={{ color: "#1A2744", fontFamily: "'Cormorant Garamond', serif" }}>
                Cartão de Crédito
              </p>
              <p className="text-xs mb-4" style={{ color: "#6B6350" }}>
                Sua assinatura foi criada com sucesso!
              </p>
              <p className="text-sm mb-6" style={{ color: "#A09880" }}>
                O pagamento será processado pelo Asaas. Assim que confirmado, seu Premium será ativado automaticamente.
              </p>
              <div
                className="rounded-xl p-4 mb-4 text-left"
                style={{ background: "#F5F0E8", border: "1px solid rgba(26,39,68,0.1)" }}
              >
                <p className="text-xs" style={{ color: "#6B6350" }}>
                  ID da assinatura: <span className="font-mono">{checkout.subscriptionId}</span>
                </p>
              </div>
              <button
                onClick={handleBack}
                className="text-sm font-semibold"
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
        </div>
      </div>
    </div>
  );
}
