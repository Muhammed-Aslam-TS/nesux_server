import mongoose from "mongoose";

const ownerNotificationSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Owner",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["NEW_ORDER", "ORDER_CANCELLED", "RETURN_REQUESTED", "LOW_STOCK", "PAYMENT_RECEIVED", "SUBSCRIPTION_EXPIRED"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const OwnerNotification = mongoose.models.OwnerNotification || mongoose.model("OwnerNotification", ownerNotificationSchema);
export default OwnerNotification;
