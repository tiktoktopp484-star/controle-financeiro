import nodemailer from "nodemailer";
import { Resend } from "resend";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
    });
  }
  return transporter;
}

let resend: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

const appUrl = () => process.env.APP_URL || "https://controle-financeiro-x7lb.onrender.com";

function buildHtml(newPassword: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1A2744;">Controle Financeiro</h2>
      <p>Sua senha foi redefinida.</p>
      <p><strong>Nova senha:</strong> <code style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px;">${newPassword}</code></p>
      <p>Recomendamos alterar após o login em "Alterar Senha".</p>
      <p><a href="${appUrl()}" style="display: inline-block; padding: 10px 24px; background: #1A2744; color: #E2C47A; text-decoration: none; border-radius: 8px;">Acessar Controle Financeiro</a></p>
    </div>
  `;
}

export async function sendResetLink(email: string, newPassword: string): Promise<boolean> {
  // Try Resend first (faster API-based)
  const client = getResend();
  if (client) {
    try {
      const { error } = await client.emails.send({
        from: process.env.FROM_EMAIL || "Controle Financeiro <onboarding@resend.dev>",
        to: email,
        subject: "Sua nova senha - Controle Financeiro",
        html: buildHtml(newPassword),
      });
      if (!error) return true;
      console.warn("[Email] Resend error:", error);
    } catch (err) {
      console.warn("[Email] Resend error:", err);
    }
  }

  // Fallback to Gmail SMTP
  const t = getTransporter();
  if (t) {
    try {
      await t.sendMail({
        from: `"Controle Financeiro" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Sua nova senha - Controle Financeiro",
        html: buildHtml(newPassword),
      });
      return true;
    } catch (err) {
      console.warn("[Email] Gmail SMTP error:", err);
    }
  }

  return false;
}
