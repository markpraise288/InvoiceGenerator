const nodemailer = require("nodemailer");
const dns = require("dns");

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
} = require("../../config/env");

// 🔥 Force IPv4 to fix ENETUNREACH (VERY IMPORTANT)
dns.setDefaultResultOrder("ipv4first");

let transporter;

const initEmailTransporter = async () => {
  try {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST || "smtp.gmail.com",
      port: Number(EMAIL_PORT) || 587,
      secure: Number(EMAIL_PORT) === 465, // true only for 465

      // 🔥 Fix for Gmail / network edge cases
      family: 4,

      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
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