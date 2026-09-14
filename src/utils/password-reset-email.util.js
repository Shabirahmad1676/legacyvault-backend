const nodemailer = require("nodemailer");

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);

// console.log(`[DEBUG] Attempting SMTP connection to: ${smtpHost}:${smtpPort}`);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER ,
    pass: process.env.SMTP_PASSWORD ,  
  },
});


async function sendPasswordResetEmail(email, resetUrl) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your LegacyVault password",

    text: `
You requested to reset your LegacyVault password.

Use this link to create a new password:

${resetUrl}

This link expires in 15 minutes.

If you did not request this, you can safely ignore this email.
`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Reset your LegacyVault password</h2>

        <p>
          We received a request to reset your LegacyVault password.
        </p>

        <p>
          <a
            href="${resetUrl}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#10b981;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          This link expires in <strong>15 minutes</strong>.
        </p>

        <p>
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = {
  sendPasswordResetEmail,
};