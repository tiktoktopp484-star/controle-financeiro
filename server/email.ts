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

async function sendViaBrevo(email: string, newPassword: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: process.env.FROM_EMAIL || "grupoofertas6@gmail.com", name: "Controle Financeiro" },
        to: [{ email }],
        subject: "Sua nova senha - Controle Financeiro",
        htmlContent: buildHtml(newPassword),
      }),
    });
    if (res.ok) return true;
    const text = await res.text();
    console.warn("[Email] Brevo error:", res.status, text);
    return false;
  } catch (err: any) {
    console.warn("[Email] Brevo error:", err?.message || err);
    return false;
  }
}

async function sendViaGmail(email: string, newPassword: string): Promise<boolean> {
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      family: 4,
      connectionTimeout: 30000,
      tls: { rejectUnauthorized: false },
    });
    await transporter.sendMail({
      from: `"Controle Financeiro" <${process.env.GMAIL_USER}>`,
      to: email, subject: "Sua nova senha - Controle Financeiro", html: buildHtml(newPassword),
    });
    return true;
  } catch (err: any) {
    console.warn("[Email] Gmail 465 error:", err?.message || err);
  }

  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 587, secure: false,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      family: 4,
      connectionTimeout: 30000,
      tls: { rejectUnauthorized: false },
    });
    await transporter.sendMail({
      from: `"Controle Financeiro" <${process.env.GMAIL_USER}>`,
      to: email, subject: "Sua nova senha - Controle Financeiro", html: buildHtml(newPassword),
    });
    return true;
  } catch (err: any) {
    console.warn("[Email] Gmail 587 error:", err?.message || err);
  }

  return false;
}

export async function sendResetLink(email: string, newPassword: string): Promise<boolean> {
  if (await sendViaBrevo(email, newPassword)) return true;
  if (await sendViaGmail(email, newPassword)) return true;
  return false;
}
