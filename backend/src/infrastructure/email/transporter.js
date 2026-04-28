const nodemailer = require("nodemailer");
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
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: false,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  await transporter.verify();
  console.log("Email server ready");
  } catch (error) {
    console.error("Failed to initialize email transporter:", error);
    transporter = null; // Ensure transporter is null if initialization fails
  }
};

const getTransporter = async () => {
  if (!transporter) {
    throw new Error("Email transporter not initialized");
  }
  return transporter;
};


module.exports = {
  initEmailTransporter,
  getTransporter,
};
