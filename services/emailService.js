import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Get the global generic nodemailer transporter configured via environment variables or DB owner settings.
 */
const getTransporter = (owner) => {
  const settings = owner?.settings?.notificationSettings;
  const service = settings?.emailService || process.env.EMAIL_SERVICE || 'gmail';
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = process.env.EMAIL_PORT || 587;
  const user = settings?.emailUser || process.env.EMAIL_USER;
  const pass = settings?.emailPass || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn("⚠️ Email service is not fully configured in DB or .env (Missing EMAIL_USER or EMAIL_PASS).");
    return null;
  }

  return nodemailer.createTransport({
    service: service || undefined,
    host: service ? undefined : host, // Use host if service is not defined
    port,
    secure: port == 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Generic function to send an email
 * @param {Object} options Email options
 * @param {string} options.to Recipient email address
 * @param {string} options.subject Email subject
 * @param {string} [options.text] Plain text version of the email body
 * @param {string} [options.html] HTML version of the email body
 * @param {Array} [options.attachments] Attachments for the email
 * @param {string} [options.from] Custom sender email address
 * @param {Object} [options.owner] Store owner object containing dynamic credentials
 * @returns {Promise<Object>} { sent: boolean, messageId?: string, reason?: string }
 */
export const sendMail = async ({ to, subject, text, html, attachments, from, owner }) => {
  const transporter = getTransporter(owner);
  
  if (!transporter) {
    return { sent: false, reason: "Email credentials not configured in .env" };
  }

  const fromEmail = from || process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const mailOptions = {
    from: fromEmail,
    to,
    subject,
    text,
    html,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return { sent: false, reason: error.message };
  }
};

/**
 * Helper to send an HTML welcome email
 */
export const sendWelcomeEmail = async (to, name) => {
  const subject = `Welcome to Nexus, ${name}!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to Nexus!</h2>
      <p>Hi ${name},</p>
      <p>We're thrilled to have you on board. If you have any questions, feel free to reply to this email.</p>
      <br />
      <p>Best regards,</p>
      <p><strong>The Nexus Team</strong></p>
    </div>
  `;
  return sendMail({ to, subject, html });
};

/**
 * Helper to send a password reset email
 */
export const sendPasswordResetEmail = async (to, resetLink) => {
  const subject = "Password Reset Request";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Reset Your Password</h2>
      <p>You requested to reset your password. Click the button below to set a new password:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <br />
      <p>Best regards,</p>
      <p><strong>The Nexus Team</strong></p>
    </div>
  `;
  return sendMail({ to, subject, html });
};

/**
 * Helper to send an order confirmation email
 */
export const sendOrderConfirmationEmail = async (to, order, owner) => {
  const subject = `Order Confirmation - ${order.orderNumber}`;
  const totalAmount = order.totalAmount ? `₹${order.totalAmount.toFixed(2)}` : 'N/A';
  
  let itemsHtml = '';
  if (order.items && order.items.length > 0) {
    itemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr>
            <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: left;">Product</th>
            <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: center;">Quantity</th>
            <th style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name || 'Product'}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #4CAF50;">Order Confirmed!</h2>
      <p>Thank you for your order. We have received your order and it is now being processed.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Order Details</h3>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Order Status:</strong> ${order.orderStatus}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Total Amount:</strong> <span style="font-size: 1.2em; font-weight: bold; color: #e53935;">${totalAmount}</span></p>
      </div>

      ${itemsHtml}
      
      <p style="margin-top: 30px;">We will notify you once your order is shipped.</p>
      <br />
      <p>Best regards,</p>
      <p><strong>The Nexus Team</strong></p>
    </div>
  `;
  return sendMail({ to, subject, html, from: owner?.email, owner });
};

export default {
  sendMail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
};
