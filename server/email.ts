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

async function sendViaSendGrid(email: string, newPassword: string): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return false;

  const fromEmail = process.env.FROM_EMAIL || "grupoofertas6@gmail.com";
  const fromName = "Controle Financeiro";

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail, name: fromName },
        subject: "Sua nova senha - Controle Financeiro",
        content: [{ type: "text/html", value: buildHtml(newPassword) }],
      }),
    });

    if (res.ok) return true;

    const text = await res.text();
    console.warn("[Email] SendGrid error:", res.status, text);
    return false;
  } catch (err: any) {
    console.warn("[Email] SendGrid fetch error:", err?.message || err);
    return false;
  }
}

async function sendViaResend(email: string, newPassword: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
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

async function sendViaGmail(email: string, newPassword: string): Promise<boolean> {
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
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
    return false;
  }
}

export async function sendResetLink(email: string, newPassword: string): Promise<boolean> {
  // 1) SendGrid (via API HTTP)
  if (await sendViaSendGrid(email, newPassword)) return true;
  // 2) Resend
  if (await sendViaResend(email, newPassword)) return true;
  // 3) Gmail SMTP (fallback)
  if (await sendViaGmail(email, newPassword)) return true;

  return false;
}
