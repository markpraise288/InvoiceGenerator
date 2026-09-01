module.exports = function invitationTemplate({ inviterName, workspaceName, role, acceptUrl }) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color:#111827; margin-bottom: 8px;">You've been invited to join ${workspaceName}</h2>
    <p style="color:#4b5563; line-height:1.6;">
      ${inviterName} invited you to join <strong>${workspaceName}</strong> on BusinessFlow as
      a <strong>${role}</strong>.
    </p>
    <a
      href="${acceptUrl}"
      style="display:inline-block; margin-top:16px; padding:12px 24px; background:#4f46e5; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;"
    >
      Accept invitation
    </a>
    <p style="color:#9ca3af; font-size:12px; margin-top:24px;">
      This invitation expires in 7 days. If you weren't expecting this, you can safely ignore this email.
    </p>
  </div>
  `;
};