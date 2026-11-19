const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho'],
      required: true,
      trim: true,
    },
    orderId: { type: String, required: true, trim: true, maxlength: 80 },
    customerName: { type: String, trim: true, maxlength: 80 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    deliveryTokenHash: { type: String, required: true, unique: true, select: false },
    trackingTokenHash: { type: String, unique: true, sparse: true, select: false },
    selectionExpiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: [
        'pending',
        'scheduled',
        'out-for-delivery',
        'delivered',
        'completed',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    slots: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliverySlot' }],
      validate: (slots) => slots.length > 0,
    },
    selectedSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliverySlot' },
    statusHistory: {
      type: [{
        status: {
          type: String,
          enum: ['pending', 'scheduled', 'out-for-delivery', 'delivered', 'completed', 'cancelled'],
          required: true,
        },
        at: { type: Date, required: true },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

deliverySchema.index(
  { platform: 1, orderId: 1 },
  {
    unique: true,
    partialFilterExpression: { platform: { $type: 'string' } },
  }
);

module.exports = mongoose.model('Delivery', deliverySchema);
