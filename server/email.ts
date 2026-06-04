let resendApiKey = "";

function getResendApiKey() {
  if (!resendApiKey) resendApiKey = process.env.RESEND_API_KEY || "";
  return resendApiKey;
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

async function sendViaResend(email: string, newPassword: string): Promise<boolean> {
  const apiKey = getResendApiKey();
  if (!apiKey) return false;

  const from = process.env.FROM_EMAIL || "Controle Financeiro <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Sua nova senha - Controle Financeiro",
        html: buildHtml(newPassword),
      }),
    });

    const data = await res.json();
    if (res.ok) return true;

    console.warn("[Email] Resend API error:", res.status, JSON.stringify(data));
    return false;
  } catch (err: any) {
    console.warn("[Email] Resend fetch error:", err?.message || err);
    return false;
  }
}

export async function sendResetLink(email: string, newPassword: string): Promise<boolean> {
  // Tenta Resend via API HTTP direta
  const ok = await sendViaResend(email, newPassword);
  if (ok) return true;

  // Se falhou, tenta nodemailer com Gmail
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
      connectionTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"Controle Financeiro" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Sua nova senha - Controle Financeiro",
      html: buildHtml(newPassword),
    });

    return true;
  } catch (err: any) {
    console.warn("[Email] Gmail error:", err?.message || err);
  }

  return false;
}
