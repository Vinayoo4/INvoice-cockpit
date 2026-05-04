// lib/types.ts
export type ID = string;

export type User = {
  id: ID;
  email: string;
  passwordHash: string;
  businessId: ID;
  role: "owner" | "staff";
  createdAt: string;
};

export type Business = {
  id: ID;
  name: string;
  gstin?: string;
  address?: string;
  country: string;
  timezone: string;
  createdAt: string;
};

export type Customer = {
  id: ID;
  businessId: ID;
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  createdAt: string;
};

export type Item = {
  id: ID;
  businessId: ID;
  name: string;
  hsn?: string;
  unit: string;
  price: number;
  gstRate: number;
};

export type InvoiceLineItem = {
  id: ID;
  itemId?: ID;
  description: string;
  quantity: number;
  rate: number;
  gstRate: number;
  amount: number;
  taxAmount: number;
};

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type Invoice = {
  id: ID;
  businessId: ID;
  number: string;
  customerId: ID;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  notes?: string;
  createdAt: string;
};

export type Payment = {
  id: ID;
  invoiceId: ID;
  businessId: ID;
  amount: number;
  currency: string;
  method: "cash" | "bank_transfer" | "upi" | "card" | "other";
  reference?: string;
  paidAt: string;
};

export type Session = {
  id: ID;
  userId: ID;
  token: string;
  expiresAt: string;
};

export type WebhookLog = {
  id: ID;
  source: "whatsapp" | "meta" | "instagram";
  direction: "inbound" | "outbound";
  from?: string;
  to?: string;
  payload: unknown;
  createdAt: string;
};
