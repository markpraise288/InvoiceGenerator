require("dotenv").config();
const { Worker } = require("bullmq");
const Redis = require("ioredis");

const { sendEmail } = require("../email/email.service");
const { initEmailTransporter } = require("../email/transporter");

const welcomeTemplate = require("../templates/welcome.template");
const passwordResetTemplate = require("../templates/resetPassword.template");
const invoiceTemplate = require("../templates/invoice.template");
const reminderTemplate = require("../templates/reminder.template");

async function startWorker() {
  await initEmailTransporter();

  const connection = new Redis({
    maxRetriesPerRequest: null,
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  });

  const worker = new Worker(
    "emailQueue",
    async (job) => {
      if (job.name === "Welcome Email") {
        const { email } = job.data;

        await sendEmail({
          to: email,
          subject: "Welcome to Invoice Generator",
          html: welcomeTemplate({ email }),
        });
      } else if (job.name === "Password Reset Email") {
        const { email, resetLink } = job.data;

        await sendEmail({
          to: email,
          subject: "Password Reset Request",
          html: passwordResetTemplate({ resetLink }),
        });
      } else if (job.name === "Invoice Email") {
        const {
          email,
          clientName,
          invoiceNumber,
          amount,
          dueDate,
          companyName,
          filename,
          path,
          payNowLink,
        } = job.data;

        await sendEmail({
          to: email,
          subject: "Your Invoice",
          html: invoiceTemplate({
            clientName,
            invoiceNumber,
            amount,
            dueDate,
            companyName,
            payNowLink,
          }),
          attachments: [
            {
              filename,
              path,
            },
          ],
        });
      } else if (job.name === "Remind Email") {
        const { to, subject, dueDate, path, filename, clientName, invoiceNumber } = job.data;
        await sendEmail({
          to,
          subject,
          html: reminderTemplate(clientName, invoiceNumber, dueDate),
          attachments: [
            {
              filename,
              path,
            }
          ]
        });
      }

    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
  });
}

startWorker();
