const nodemailer = require("nodemailer");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
} = require("../../config/env");

let transporter;

const initEmailTransporter = async () => {
  try {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST || "smtp.gmail.com",
      port: 587,
      secure: false,

      family: 4,

      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },

      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();
    console.log("✅ Email server ready");
  } catch (error) {
    console.error("❌ Failed to initialize email transporter:");
    console.error(error.message || error);

    transporter = null;
  }
};

const getTransporter = () => {
  if (!transporter) {
    throw new Error("Email transporter not initialized");
  }
  return transporter;
};

module.exports = {
  initEmailTransporter,
  getTransporter,
};