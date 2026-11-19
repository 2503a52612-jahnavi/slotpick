const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm');
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD')
  .refine((value) => {
    const timestamp = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  }, 'Date must be a real calendar date');
const futureDate = isoDate.refine(
  (value) => value >= new Date().toISOString().slice(0, 10),
  'Date must be today or later'
);
const platform = z.enum(['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho']);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Phone must be 10-15 digits').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(12, 'New password must be at least 12 characters').max(72),
});

const agentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Phone must be 10-15 digits').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

const slotSchema = z
  .object({
    date: futureDate,
    start: time,
    end: time,
    capacity: z.number().int().min(1).max(100).default(1),
  })
  .refine((slot) => slot.end > slot.start, {
    path: ['end'],
    message: 'Slot end must be later than its start',
  });

const createDeliverySchema = z
  .object({
    platform,
    orderId: z.string().trim().min(1).max(80),
    customerName: z.string().trim().min(2).max(80).optional(),
    address: z.string().trim().min(1).max(500),
    customerId: objectId.optional(),
    assignedAgentId: objectId.optional(),
    selectionMinutes: z.number().int().min(1).max(60).default(10),
    slots: z.array(slotSchema).min(1).max(30),
  })
  .superRefine((delivery, context) => {
    if (!delivery.customerId && !delivery.customerName) {
      context.addIssue({
        code: 'custom',
        path: ['customerName'],
        message: 'Customer name is required when no customer account is linked',
      });
    }

    const seen = new Set();
    delivery.slots.forEach((slot, index) => {
      const key = `${slot.date}:${slot.start}:${slot.end}`;
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['slots', index],
          message: 'Duplicate delivery slot',
        });
      }
      seen.add(key);
    });
  });

const bookSlotSchema = z.object({
  slotId: objectId,
});

const deliveryLookupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  platform,
  orderId: z.string().trim().min(1).max(80),
});

const deliveryStatusSchema = z.object({
  status: z.enum(['scheduled', 'out-for-delivery', 'delivered']),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  agentSchema,
  createDeliverySchema,
  bookSlotSchema,
  deliveryLookupSchema,
  deliveryStatusSchema,
};
