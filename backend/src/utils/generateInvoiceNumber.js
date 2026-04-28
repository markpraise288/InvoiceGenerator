const Counter = require("../infrastructure/counters/counter");

const generateInvoiceNumber = async (userId) => {
  const counter = await Counter.findOneAndUpdate(
    { userId },
    { $inc: { sequenceValue: 1 } },
    {
      returnDocument: "after",
      upsert: true,
      projection: { sequenceValue: 1 },
    },
  );
  const invoiceNumber = `INV-${counter.sequenceValue.toString().padStart(6, "0")}`;
  return invoiceNumber;
};

module.exports = generateInvoiceNumber;
