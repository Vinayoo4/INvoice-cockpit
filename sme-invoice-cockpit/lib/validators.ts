// lib/validators.ts
import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(6).max(18).optional().or(z.literal("")),
  gstin: z.string().min(5).max(20).optional().or(z.literal("")),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
});

export const itemSchema = z.object({
  name: z.string().min(1),
  hsn: z.string().optional(),
  unit: z.string().min(1),
  price: z.number().nonnegative(),
  gstRate: z.number().min(0).max(28),
});

export const lineItemSchema = z.object({
  itemId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  gstRate: z.number().min(0).max(28),
});

export const invoiceCreateSchema = z.object({
  customerId: z.string().min(1),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().default("INR"),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  status: z.enum(["draft", "sent"]).optional().default("sent"),
});

export const invoiceUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  notes: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const paymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  method: z.enum(["cash", "bank_transfer", "upi", "card", "other"]),
  reference: z.string().optional(),
  paidAt: z.string().optional(),
});

export const businessUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
});
