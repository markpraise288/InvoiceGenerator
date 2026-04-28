const { Queue } = require("bullmq");
const Redis = require("ioredis");

const connection = new Redis({
  maxRetriesPerRequest: null,
});

const emailQueue = new Queue("emailQueue", { connection });

module.exports = {
  emailQueue,
};
