const { getTransporter } = require('./transporter');
const { EMAIL_FROM } = require('../../config/env');

const sendEmail = async ({ to, subject, html, attachments = []}) => {
  const transporter = await getTransporter();

  if(!transporter) {
    throw new Error("Email transporter not initialized");
  }

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    attachments
  });
};

module.exports = {
  sendEmail,
};