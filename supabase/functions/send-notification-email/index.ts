import { corsHeaders } from '../_shared/cors.ts';

interface EmailPayload {
  to: string;
  subject: string;
  title: string;
  message: string;
  ticketId?: string;
  actionUrl?: string;
  actionText?: string;
}

function buildHtmlTemplate({ title, message, ticketId, actionUrl, actionText }: EmailPayload): string {
  const currentYear = new Date().getFullYear();
  const ctaButton = actionUrl
    ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${actionUrl}" style="background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px;">
          ${actionText || 'Acessar Chamado no Sistema'}
        </a>
      </div>
    `
    : '';

  const ticketBadge = ticketId
    ? `<span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; font-family: monospace;">${ticketId}</span>`
    : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #0284c7;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">TECNO <span style="color: #38bdf8;">SYSTEM</span></span>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Service Desk • Empresa Júnior</div>
                  </td>
                  <td align="right">
                    ${ticketBadge}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 700;">${title}</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                ${message}
              </p>
              ${ctaButton}
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-top: 24px; font-size: 12px; color: #64748b;">
                <strong>Aviso de Segurança:</strong> Não responda diretamente a este e-mail. Para interagir ou acompanhar, utilize a plataforma interna Tecno System.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              © ${currentYear} Tecno System Empresa Júnior. Todos os direitos reservados.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { to, subject, title, message } = payload;

    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Campos to, subject e message são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = buildHtmlTemplate(payload);
    const textFallback = `${title || subject}\n\n${message}\n\nTecno System Service Desk`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (resendApiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Tecno System <suporte@tecnosystem.org.br>',
          to: [to],
          subject,
          html,
          text: textFallback,
        }),
      });

      if (!resendRes.ok) {
        const errorData = await resendRes.text();
        return new Response(JSON.stringify({ error: 'Erro ao enviar via Resend: ' + errorData }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sendResult = await resendRes.json();
      return new Response(JSON.stringify({ success: true, provider: 'resend', id: sendResult.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Modo desenvolvimento / sem chave externa (fallback transparente com log estruturado)
    console.log(`[Email Dispatch] Simulação para ${to} | Assunto: ${subject}`);
    return new Response(
      JSON.stringify({
        success: true,
        provider: 'dev_mock',
        to,
        subject,
        preview_text: textFallback.substring(0, 150) + '...',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro interno ao processar e-mail' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
