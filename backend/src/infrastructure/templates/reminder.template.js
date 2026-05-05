const reminderTemplate = ({clientName, invoiceNumber, dueDate}) => {
    const formattedDueDate = new Date(dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    return `
        <p>Dear ${clientName},</p>
        <p>This is a friendly reminder that your invoice <strong>${invoiceNumber}</strong> is due on <strong>${formattedDueDate}</strong>.</p>
        <p>Please make sure to settle the payment by the due date to avoid any late fees.</p>
        <p>Thank you for your business!</p>
    `;
}

module.exports = reminderTemplate;