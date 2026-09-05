import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId) {
  throw new Error("Missing environment variable: RAZORPAY_KEY_ID");
}

if (!keySecret) {
  throw new Error("Missing environment variable: RAZORPAY_KEY_SECRET");
}

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});
