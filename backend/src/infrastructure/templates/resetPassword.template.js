const resetPasswordTemplate = ({ resetLink }) => {

  return `
  <div style="font-family:Arial">

    <h2>Password Reset</h2>

    <p>You requested to reset your password.</p>

    <p>
      Click the button below to reset it.
    </p>

    <a href="${resetLink}"
       style="
        display:inline-block;
        padding:10px 20px;
        background:#2F80ED;
        color:white;
        text-decoration:none;
        border-radius:5px;
       ">
      Reset Password
    </a>

    <p>If you didn't request this, ignore this email.</p>

  </div>
  `;
};

module.exports = resetPasswordTemplate;