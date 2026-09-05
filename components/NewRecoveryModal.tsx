"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface NewRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewRecoveryModal({ isOpen, onClose, onSuccess }: NewRecoveryModalProps) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(`order_TEST_${Math.floor(1000 + Math.random() * 9000)}`);
  const [amount, setAmount] = useState("3499");
  const [failureReason, setFailureReason] = useState("BAD_REQUEST_PAYMENT_TIMED_OUT");
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create Order
      const resOrder = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount) * 100, // paise
          currency: "INR",
          merchant_id: "mch_acme_test_01",
        }),
      });

      if (!resOrder.ok) {
        throw new Error("Failed to initialize transaction order.");
      }

      const orderData = await resOrder.json();
      const rzpOrderId = orderData.order.id;

      // Step 2: Simulate Payment Failure Event
      const failRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "failed",
          razorpay_order_id: rzpOrderId,
          failure_reason: failureReason,
          error_code: failureReason,
          payment_method: paymentMethod,
        }),
      });

      if (!failRes.ok) {
        throw new Error("Failed to register payment failure event.");
      }

      const failResult = await failRes.json();

      onClose();
      if (onSuccess) onSuccess();
      router.push(`/recovery/${failResult.case_id || ""}`);
      router.refresh();
    } catch (err: any) {
      alert("Error creating recovery case: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-md p-6 rounded-[24px] shadow-2xl relative border border-border bg-surface">
        <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">add_card</span>
            <h2 className="font-headline font-bold text-lg text-text-primary">New Recovery Case</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-surface-secondary"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[10px] text-text-secondary uppercase mb-1">Customer Order Reference</label>
            <input
              type="text"
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full bg-surface-secondary border border-border text-text-primary rounded-[12px] px-3.5 py-2.5 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-text-secondary uppercase mb-1">Amount (INR ₹)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-surface-secondary border border-border text-text-primary rounded-[12px] px-3.5 py-2.5 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary uppercase mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-surface-secondary border border-border text-text-primary rounded-[12px] px-3.5 py-2.5 focus:outline-none focus:border-primary"
              >
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="NetBanking">NetBanking</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-text-secondary uppercase mb-1">Failure Cause</label>
            <select
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              className="w-full bg-surface-secondary border border-border text-text-primary rounded-[12px] px-3.5 py-2.5 focus:outline-none focus:border-primary"
            >
              <option value="BAD_REQUEST_PAYMENT_TIMED_OUT">BAD_REQUEST_PAYMENT_TIMED_OUT</option>
              <option value="BAD_REQUEST_UPI_TIMEOUT">BAD_REQUEST_UPI_TIMEOUT</option>
              <option value="GATEWAY_TIMEOUT">GATEWAY_TIMEOUT</option>
              <option value="EXPIRED_CARD">EXPIRED_CARD</option>
              <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS</option>
              <option value="FRAUD_SUSPICIOUS">FRAUD_SUSPICIOUS</option>
            </select>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary rounded-[12px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-5 py-2.5 font-bold rounded-[14px] shadow-md shadow-primary/20 hover:brightness-110 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  Instantiate Case
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
