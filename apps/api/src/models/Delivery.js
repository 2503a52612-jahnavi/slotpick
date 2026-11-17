const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, trim: true, maxlength: 80 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    deliveryTokenHash: { type: String, required: true, unique: true, select: false },
    selectionExpiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    slots: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliverySlot' }],
      validate: (slots) => slots.length > 0,
    },
    selectedSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliverySlot' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Delivery', deliverySchema);
