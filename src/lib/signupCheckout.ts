export type SignupCheckoutState = {
  checkoutReference: string;
  planId: string;
  planName: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  email: string;
  name: string;
  paymentStatus: "success" | "failed" | "pending";
  paymentId?: string | null;
  orderId?: string | null;
  provider?: string | null;
};

const SUCCESS_KEY = "signup_checkout_success";
const FAILURE_KEY = "signup_checkout_failure";

const readState = (key: string): SignupCheckoutState | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SignupCheckoutState;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

const writeState = (key: string, value: SignupCheckoutState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const readSuccessfulSignupCheckout = () => readState(SUCCESS_KEY);
export const readFailedSignupCheckout = () => readState(FAILURE_KEY);

export const storeSuccessfulSignupCheckout = (value: SignupCheckoutState) => {
  writeState(SUCCESS_KEY, value);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(FAILURE_KEY);
  }
};

export const storeFailedSignupCheckout = (value: SignupCheckoutState) => {
  writeState(FAILURE_KEY, value);
};

export const clearSignupCheckoutState = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SUCCESS_KEY);
  window.localStorage.removeItem(FAILURE_KEY);
};
