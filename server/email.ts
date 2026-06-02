import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

const appUrl = () => process.env.APP_URL || "https://controle-financeiro-x7lb.onrender.com";

export async function sendResetLink(email: string, newPassword: string): Promise<boolean> {
  const client = getResend();
  if (!client) return false;
  try {
    const { error } = await client.emails.send({
      from: process.env.FROM_EMAIL || "Controle Financeiro <onboarding@resend.dev>",
      to: email,
      subject: "Sua nova senha - Controle Financeiro",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1A2744;">Controle Financeiro</h2>
          <p>Sua senha foi redefinida.</p>
          <p><strong>Nova senha:</strong> <code style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px;">${newPassword}</code></p>
          <p>Recomendamos alterar após o login em "Alterar Senha".</p>
          <p><a href="${appUrl()}" style="display: inline-block; padding: 10px 24px; background: #1A2744; color: #E2C47A; text-decoration: none; border-radius: 8px;">Acessar Controle Financeiro</a></p>
        </div>
      `,
    });
    if (error) { console.warn("[Email] Resend error:", error); return false; }
    return true;
  } catch (err) { console.warn("[Email] Failed to send:", err); return false; }
}
