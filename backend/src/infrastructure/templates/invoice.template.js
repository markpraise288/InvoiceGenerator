module.exports = ({ clientName, invoiceNumber, amount, dueDate, companyName, payNowLink }) => {
  return `
  <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:30px;">
    
    <div style="max-width:600px; margin:auto; background:white; padding:30px; border-radius:8px;">
      
      <h2 style="color:#333;">Invoice from ${companyName}</h2>

      <p>Hello <strong>${clientName}</strong>,</p>

      <p>
        Thank you for your business. Please find your invoice details below.
      </p>

      <div style="background:#f9fafb; padding:20px; border-radius:6px; margin:20px 0;">
        
        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>

      </div>

      <p>
        The invoice PDF is attached to this email.
      </p>

      ${payNowLink ? `
      <p style="text-align:center; margin: 25px 0;">
        <a href="${payNowLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Pay Now</a>
      </p>
      ` : ''}

      <p>
        Please make payment before the due date.
      </p>


      <hr style="margin:30px 0;" />

      <p style="font-size:14px; color:#666;">
        If you have any questions regarding this invoice, please reply to this email.
      </p>

      <p>
        Best regards,<br/>
        <strong>${companyName}</strong>
      </p>

    </div>

  </div>
  `;
};