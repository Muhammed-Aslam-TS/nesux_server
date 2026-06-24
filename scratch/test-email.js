import { sendMail } from '../services/emailService.js';

const testEmail = async () => {
  console.log("Testing email service...");
  // Replace with a valid email to test
  const testRecipient = "test@example.com"; 

  const result = await sendMail({
    to: testRecipient,
    subject: "Test Email from Nexus",
    html: "<h2>Success!</h2><p>Your nodemailer configuration is working perfectly.</p>"
  });

  if (result.sent) {
    console.log("✅ Test email sent successfully! Check your inbox.");
  } else {
    console.error("❌ Failed to send test email:", result.reason);
  }
};

testEmail();
