import { supabase } from "../lib/supabase";
import { razorpayAdapter } from "../adapters/razorpay/razorpay.adapter";
import { auditService } from "./audit.service";

export interface Payment {
  id?: string;
  merchant_id: string;
  order_id: string | null;
  payment_id: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  status: string;
  failure_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

export const paymentService = {
  async getPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  },

  async getPaymentsByMerchant(merchantId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  },

  async createPayment(payment: Omit<Payment, "id" | "created_at" | "updated_at">): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .insert(payment)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data;
  },

  async updatePaymentByOrderId(orderId: string, updates: Partial<Payment>): Promise<Payment> {
    const { data, error } = await supabase
      .from("payments")
      .update(updates)
      .eq("order_id", orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Complete Phase 4 order creation flow:
   * 1. Fetches fallback merchant if needed.
   * 2. Calls Razorpay Adapter.
   * 3. Saves payment record with status "created".
   * 4. Logs order creation to audit_logs.
   */
  async createRazorpayOrder(amount: number, currency: string, merchantId?: string) {
    let selectedMerchantId = merchantId;

    // Check if passed merchantId exists in DB
    if (selectedMerchantId) {
      const { data: existingMerchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("id", selectedMerchantId)
        .maybeSingle();

      if (!existingMerchant) {
        selectedMerchantId = undefined;
      }
    }

    // Resolve default merchant if none specified or invalid
    if (!selectedMerchantId) {
      const { data: merchants, error: merchantError } = await supabase
        .from("merchants")
        .select("id")
        .limit(1);

      if (!merchantError && merchants && merchants.length > 0) {
        selectedMerchantId = merchants[0].id;
      } else {
        // Auto-create default merchant if table empty
        const { data: newMch } = await supabase
          .from("merchants")
          .insert({ name: "Acme Merchant", email: "operator@acme.sys" })
          .select("id")
          .single();
        selectedMerchantId = newMch?.id || "3e116b14-846f-4a8c-b75a-a59abf73384a";
      }
    }

    const receipt = `receipt_order_${Date.now()}`;
    const order = await razorpayAdapter.createOrder(amount, currency || "INR", receipt);

    // Save payment record (status = "created", amount is converted to major unit for DB)
    const payment = await this.createPayment({
      merchant_id: selectedMerchantId!,
      order_id: order.id,
      payment_id: null,
      amount: amount / 100, // DB saves in major unit (e.g. 499.00)
      currency: currency || "INR",
      payment_method: null,
      status: "created",
      failure_reason: null,
    });

    // Write audit log entry
    await auditService.createAuditLog({
      recovery_case_id: null,
      payment_id: payment.id!,
      actor: "SYSTEM",
      event_type: "Order created",
      reason: `Razorpay order created successfully. Amount: ${amount} paise.`,
      result: `Order ID: ${order.id}. Payment ID: ${payment.id}`,
      metadata: { order_id: order.id, amount, currency },
    });

    return order;
  }
};
