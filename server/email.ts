import nodemailer from "nodemailer";
import { Resend } from "resend";

let transporter465: nodemailer.Transporter | null = null;
let transporter587: nodemailer.Transporter | null = null;

function getTransporter465() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass) return null;
  if (!transporter465) {
    transporter465 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 10000,
    });
  }
  return transporter465;
}

function getTransporter587() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass) return null;
  if (!transporter587) {
    transporter587 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 10000,
    });
  }
  return transporter587;
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
  // Tenta Gmail SMTP porta 465 (SSL)
  const t465 = getTransporter465();
  if (t465) {
    try {
      await t465.sendMail({
        from: `"Controle Financeiro" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Sua nova senha - Controle Financeiro",
        html: buildHtml(newPassword),
      });
      return true;
    } catch (err: any) {
      console.warn("[Email] Gmail 465 error:", err?.message || err);
    }
  }

  // Tenta Gmail SMTP porta 587 (STARTTLS)
  const t587 = getTransporter587();
  if (t587) {
    try {
      await t587.sendMail({
        from: `"Controle Financeiro" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Sua nova senha - Controle Financeiro",
        html: buildHtml(newPassword),
      });
      return true;
    } catch (err: any) {
      console.warn("[Email] Gmail 587 error:", err?.message || err);
    }
  }

  // Fallback: Resend
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

  return false;
}
