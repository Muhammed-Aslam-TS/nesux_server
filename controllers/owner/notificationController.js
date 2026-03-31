import OwnerNotification from "../../model/ownerNotificationModel.js";

// Fetch notifications for the logged-in owner
export const getOwnerNotifications = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const notifications = await OwnerNotification.find({ ownerId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('orderId', 'orderNumber totalAmount orderStatus');

    const total = await OwnerNotification.countDocuments({ ownerId });
    const unreadCount = await OwnerNotification.countDocuments({ ownerId, isRead: false });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark notification as read
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    const notification = await OwnerNotification.findOneAndUpdate(
      { _id: id, ownerId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all notifications as read
export const markAllRead = async (req, res) => {
  try {
    const ownerId = req.user.id;
    await OwnerNotification.updateMany({ ownerId, isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
