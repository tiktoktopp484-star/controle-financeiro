import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

const appUrl = () => process.env.APP_URL || "https://controle-financeiro-x7lb.onrender.com";

export async function sendResetLink(email: string, token: string): Promise<boolean> {
  const client = getResend();
  if (!client) return false;
  const link = `${appUrl()}/reset-password?token=${token}`;
  try {
    const { error } = await client.emails.send({
      from: "Controle Financeiro <onboarding@resend.dev>",
      to: email,
      subject: "Redefinir sua senha - Controle Financeiro",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1A2744;">Controle Financeiro</h2>
          <p>Recebemos um pedido de redefinição de senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <p><a href="${link}" style="display: inline-block; padding: 12px 28px; background: #1A2744; color: #E2C47A; text-decoration: none; border-radius: 8px; font-size: 16px;">Redefinir Senha</a></p>
          <p style="color: #888; font-size: 14px;">Este link expira em 1 hora.</p>
          <p style="color: #888; font-size: 14px;">Se você não solicitou, ignore este email.</p>
          <hr style="margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px;">Controle Financeiro</p>
        </div>
      `,
    });
    if (error) { console.warn("[Email] Resend error:", error); return false; }
    return true;
  } catch (err) { console.warn("[Email] Failed to send:", err); return false; }
}
