import dotenv from "dotenv";
import twilio from "twilio";
import nodemailer from "nodemailer";
import OwnerNotification from "../model/ownerNotificationModel.js";
import Owner from "../model/OwnerModels.js";

dotenv.config();

// --- Dynamic Configuration Helpers ---

const getTransporter = (owner) => {
  const settings = owner?.settings?.notificationSettings;
  const user = settings?.emailUser || process.env.EMAIL_USER;
  const pass = settings?.emailPass || process.env.EMAIL_PASS;
  const service = settings?.emailService || "gmail";

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service,
    auth: { user, pass },
  });
};

const getTwilioConfig = (owner) => {
  const settings = owner?.settings?.notificationSettings;
  return {
    sid: settings?.twilioSid || process.env.TWILIO_ACCOUNT_SID,
    token: settings?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
    smsFrom: settings?.twilioFrom || process.env.TWILIO_SMS_FROM,
    whatsappFrom: settings?.twilioFrom ? `whatsapp:${settings.twilioFrom}` : process.env.TWILIO_WHATSAPP_FROM
  };
};



function sanitizePhoneE164(phone) {
  if (!phone) return null;
  const defaultCountryCode = (process.env.DEFAULT_COUNTRY_CODE || "+91").trim();
  const ensurePlus = (cc) => (cc.startsWith("+") ? cc : `+${cc}`);

  const raw = String(phone).trim();
  if (raw.startsWith("+")) {
    return raw;
  }

  // Strip all non-digits
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return null;

  // Convert 00-prefix to + (international format like 0091...)
  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`;
  }

  // Remove leading 0 for local formats like 0XXXXXXXXXX
  if (/^0\d{10}$/.test(digits)) {
    digits = digits.slice(1);
  }

  // If 11-15 digits, assume it already includes country code
  if (/^\d{11,15}$/.test(digits)) {
    return `+${digits}`;
  }

  // If 10 digits, prefix default country code
  if (/^\d{10}$/.test(digits)) {
    return `${ensurePlus(defaultCountryCode)}${digits}`;
  }

  // Fallback: if still 11-15 digits after transformations
  if (/^\d{11,15}$/.test(digits)) {
    return `+${digits}`;
  }

  return null;
}

export async function sendSMS(toPhone, body, owner = null) {
  const config = getTwilioConfig(owner);
  if (!config.sid || !config.token || !config.smsFrom) {
    return { sent: false, reason: "Twilio SMS not configured" };
  }

  const client = twilio(config.sid, config.token);
  const to = sanitizePhoneE164(toPhone);
  if (!to) return { sent: false, reason: "Invalid recipient phone" };

  try {
    const res = await client.messages.create({
      to,
      from: config.smsFrom,
      body,
    });
    return { sent: true, sid: res.sid };
  } catch (err) {
    return { sent: false, reason: err?.message || "SMS send failed" };
  }
}

export async function sendWhatsApp(toPhone, body, owner = null) {
  const config = getTwilioConfig(owner);
  if (!config.sid || !config.token || !config.whatsappFrom) {
    return { sent: false, reason: "Twilio WhatsApp not configured" };
  }

  const client = twilio(config.sid, config.token);
  const e164 = sanitizePhoneE164(toPhone);
  if (!e164) return { sent: false, reason: "Invalid recipient phone" };
  const to = `whatsapp:${e164}`;

  try {
    const res = await client.messages.create({
      to,
      from: config.whatsappFrom,
      body,
    });
    return { sent: true, sid: res.sid };
  } catch (err) {
    return { sent: false, reason: err?.message || "WhatsApp send failed" };
  }
}

// Email sender
export async function sendEmail(to, subject, body, owner = null) {
  const transporter = getTransporter(owner);
  if (!transporter) {
    return { sent: false, reason: "Email credentials not configured" };
  }

  const fromEmail = owner?.settings?.notificationSettings?.emailUser || process.env.EMAIL_USER;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text: body,
    });
    return { sent: true };
  } catch (err) {
    console.error("❌ Email send failed:", err);
    return { sent: false, reason: err.message };
  }
}

export function buildOrderMessage({ greetingName, orderNumber, amount, status }) {
  const safeName = greetingName || "Customer";
  const safeStatus = status || "PENDING";
  const safeAmount = typeof amount === "number" ? amount.toFixed(2) : amount;
  return `Dear ${safeName}, your order ${orderNumber} of Rs ${safeAmount} is ${safeStatus}. Thank you for shopping with us.`;
}

export async function sendOrderNotifications({
  user,
  order,
  channels = { sms: true, whatsapp: true, email: false },
  overrideMessage,
}) {
  const message =
    overrideMessage ||
    buildOrderMessage({
      greetingName: user?.name || user?.firstName || user?.email || "Customer",
      orderNumber: order?.orderNumber || order?._id,
      amount: order?.totalAmount,
      status: order?.orderStatus || order?.paymentStatus || "PENDING",
    });

  const results = {};

  if (channels.sms) {
    results.sms = await sendSMS(user?.mobile, message);
  }

  if (channels.whatsapp) {
    results.whatsapp = await sendWhatsApp(user?.mobile, message);
  }

  if (channels.email) {
    results.email = await sendEmail(user?.email,message);
  }

  console.log(results,"----------results--------");
  return results;
}


export async function createOwnerNotification({ ownerId, type, title, message, orderId }) {
  try {
    const notification = new OwnerNotification({
      ownerId,
      type,
      title,
      message,
      orderId,
    });
    await notification.save();

    // 📢 Fetch owner for SMS/Email
    const owner = await Owner.findById(ownerId).select("+settings.notificationSettings.emailPass +settings.notificationSettings.twilioAuthToken");
    if (owner) {
      // 1. Send SMS to Owner
      if (owner.mobile) {
        await sendSMS(owner.mobile, `[Nexus] ${title}: ${message}`, owner);
      }

      // 2. Send Email to Owner
      if (owner.email) {
        await sendEmail(owner.email, `Nexus Store Notification: ${title}`, message, owner);
      }

      // 3. Optional: WhatsApp
      if (owner.mobile) {
        await sendWhatsApp(owner.mobile, `[Nexus] *${title}*\n${message}`, owner);
      }
    }

    return { success: true, notification };
  } catch (err) {
    console.error("❌ Error creating owner notification:", err);
    return { success: false, error: err.message };
  }
}

export default {
  sendSMS,
  sendWhatsApp,
  sendEmail,
  sendOrderNotifications,
  buildOrderMessage,
  createOwnerNotification,
};


