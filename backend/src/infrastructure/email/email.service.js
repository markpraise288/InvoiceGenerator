const { EMAIL_FROM } = require('../../config/env');
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, html, attachments }) => {
  try {
    const msg = {
      to,
      from: process.env.EMAIL_FROM, // must be verified in SendGrid
      subject,
      html,
      attachments,
    };

    await sgMail.send(msg);

    console.log("✅ Email sent");
  } catch (error) {
    console.error("❌ SendGrid error:", error.response?.body || error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
};