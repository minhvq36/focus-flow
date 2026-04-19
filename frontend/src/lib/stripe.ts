import { loadStripe } from '@stripe/stripe-js';

/**
 * Stripe.js initialization
 */
export const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLIC_KEY || ''
);
