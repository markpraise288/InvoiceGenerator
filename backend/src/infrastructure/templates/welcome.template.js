const welcomeTemplate = ({ email }) => {

  return `
  <div style="font-family:Arial; line-height:1.6">

    <h2>Welcome ${email} 👋</h2>

    <p>Thank you for joining <b>Invoice Generator</b>.</p>

    <p>You can now:</p>

    <ul>
      <li>Create professional invoices</li>
      <li>Send invoices to clients</li>
      <li>Track payments</li>
    </ul>

    <p>We’re excited to have you on board.</p>

    <p>
      Best regards<br>
      Invoice Generator Team
    </p>

  </div>
  `;
};

module.exports = welcomeTemplate;