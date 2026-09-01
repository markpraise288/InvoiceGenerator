const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html, attachments }) => {
  try {
    const emailData = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };

    // Resend expects attachments in a different format than SendGrid.
    if (attachments?.length) {
      emailData.attachments = attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
      }));
    }

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error("❌ Resend error:", error);
      throw error;
    }

    console.log("✅ Email sent:", data?.id);

    return data;
  } catch (error) {
    console.error("❌ Resend error:", error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
};