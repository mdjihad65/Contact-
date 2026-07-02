export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const payload = JSON.parse(event.body);
    const data = payload.ordered_human_fields 
      ? payload.ordered_human_fields.reduce((acc, field) => ({ ...acc, [field.name]: field.value }), {})
      : (payload.data || {});

    // Ensure we are processing the specific contact form
    if (payload.form_name !== "contact-form") {
      return { statusCode: 200, body: "Form ignored" };
    }

    // Extract User Inputs
    const name = data.name || "N/A";
    const email = data.email || "N/A";
    const message = data.message || "N/A";

    // 🔒 Extract Client IP directly from Netlify Connection Headers
    const ip = event.headers["x-nf-client-connection-ip"] || "Unknown";
    
    // Extract Client Telemetry
    const secUserAgent = data.sec_user_agent || "N/A";
    const secScreen = data.sec_screen || "N/A";
    const secTimezone = data.sec_timezone || "N/A";
    const secLanguage = data.sec_language || "N/A";

    // Grab secret credentials stored safely in your Netlify Environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("Missing Environment Variables inside Netlify settings.");
      return { statusCode: 500, body: "Configuration Error" };
    }

    // Format the alert message with markdown styling
    const alertMessage = [
      "🔔 *New Secure Form Submission*",
      `👤 *Name:* ${name}`,
      `📧 *Email:* ${email}`,
      `💬 *Message:* ${message}`,
      "",
      "🔒 *Security & Device Metrics:*",
      `• *Client IP Address:* ${ip}`,
      `• *Browser/Device:* ${secUserAgent}`,
      `• *Resolution:* ${secScreen}`,
      `• *Visitor Timezone:* ${secTimezone}`,
      `• *Locale Language:* ${secLanguage}`
    ].join("\n");

    // Send payload securely to Telegram API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: alertMessage,
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram API responded with code: ${response.status}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Successfully forwarded submission!" })
    };

  } catch (error) {
    console.error("Handler error:", error);
    return { statusCode: 500, body: error.message };
  }
}
