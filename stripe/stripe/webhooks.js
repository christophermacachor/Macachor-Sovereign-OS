/**
 * MSOS • Stripe Webhook Handler
 * Deterministic Event Intake → Entitlement Activation → Rights Binding
 */

import Stripe from "stripe";
import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

const router = express.Router();

// Deterministic audit log path
const AUDIT_LOG = path.join(process.cwd(), "stripe", "audit.log");

// Append audit entry
function audit(event) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    type: event.type,
    id: event.id,
    data: event.data.object
  }) + "\n";

  fs.appendFileSync(AUDIT_LOG, line);
}

// Deterministic entitlement activation stub
function activateEntitlements(session) {
  // MSOS: This is where you bind entitlements + rights
  // Example:
  // grantEntitlement(session.customer, "MSOS_LICENSE_STANDARD");
  return true;
}

// Webhook endpoint
router.post("/stripe/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Always audit
  audit(event);

  // Deterministic event routing
  switch (event.type) {
    case "checkout.session.completed":
      activateEntitlements(event.data.object);
      break;

    case "payment_intent.succeeded":
      // Additional MSOS logic can go here
      break;

    case "invoice.paid":
      // Subscription renewal logic
      break;

    default:
      // Unhandled events are still audited
      break;
  }

  res.json({ received: true });
});

export default router;
