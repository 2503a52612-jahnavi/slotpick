const mongoose = require('mongoose');

const deliverySlotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1, default: 1 },
    bookedCount: { type: Number, required: true, min: 0, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

deliverySlotSchema.index({ date: 1, start: 1, end: 1 }, { unique: true });

module.exports = mongoose.model('DeliverySlot', deliverySlotSchema);
