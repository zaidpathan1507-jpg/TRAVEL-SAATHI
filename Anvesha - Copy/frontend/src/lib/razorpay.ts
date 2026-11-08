/** Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/). Card / UPI details are
 * entered in Razorpay's own window; this app only receives the payment id and signature. */

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (r: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

let loading: Promise<void> | null = null;
export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error('Could not load Razorpay. Check your internet connection.'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export interface CheckoutOptions {
  keyId: string;
  orderId: string;
  /** paise */
  amount: number;
  currency: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

/** Opens Razorpay Checkout. Resolves with the payment result, rejects if the window is closed or the payment fails. */
export async function payWithRazorpay(o: CheckoutOptions): Promise<RazorpayResult> {
  await loadRazorpay();
  return new Promise<RazorpayResult>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: o.keyId,
      amount: o.amount,
      currency: o.currency,
      order_id: o.orderId,
      name: 'Anvesha',
      description: o.description,
      prefill: o.prefill,
      theme: { color: '#111827' },
      handler: (r: RazorpayResult) => resolve(r),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
    rzp.open();
  });
}
