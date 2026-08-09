# Runbook: Payment (Donation) Failure

**Phase 100 of implementationplan.md Group K.** Covers `services/compliance`'s donation flow (Group I) — a donor's payment either didn't go through, or went through but the receipt didn't generate. These are two independent failure modes with two independent recovery paths; don't conflate them.

## 1. The two failure modes, and why they're separate

| Symptom | Table/column | Cause category | Recovery |
|---|---|---|---|
| Payment itself failed (donor charged nothing, or the charge didn't confirm) | `donations.payment_status = 'failed'` | `MockRazorpayProvider`'s real failure branch (`clientPaymentId` prefixed `fail_` in this build) or, in production, a real Razorpay decline | Donor retries via `DonateScreen` — a fresh donation row, not a repair of the old one (payment status is not something this app should silently "fix" after the fact) |
| Payment succeeded but the receipt never generated | `donations.payment_status = 'succeeded'` AND `donations.receipt_status = 'failed'`/`'pending'` with `receipt_attempts > 0` | `MockReceiptProvider` deliberately fails every donation's first attempt (Phase 80's proof that the retry path is real, not aspirational) — or, in production, a real receipt-generation service error | Call `services/compliance`'s `receipts.reconcile()` — idempotent, safe to call repeatedly, designed exactly for this |

**The core design fact this runbook depends on:** receipt generation is deliberately decoupled from the payment-success response (edgecase.md §8.6) — a donor's money is never held hostage to whether a PDF generated successfully. Never treat "receipt failed" as equivalent to "payment failed"; they're independent axes.

## 2. Triage

1. Get the `donation_id` (from the reporter, or query `SELECT * FROM donations WHERE donor_id = '<user>' ORDER BY created_at DESC LIMIT 5;`).
2. Check both status columns independently — `payment_status` and `receipt_status` — before deciding which failure mode this is.
3. If `payment_status = 'pending'` and has been for more than a few minutes: this usually means the client never got a chance to call `confirm()` (app crashed/closed mid-flow) — check whether a `razorpay_order_id` exists (order was created) but no `razorpay_payment_id` (payment was never confirmed back).

## 3. Response — payment failed

1. Confirm this is a genuine decline, not a data-entry bug: re-check the donation amount and NGO page's `ngo_approval_status` — remember `donations_enforce_ngo_approved`'s trigger already hard-blocks any donation attempt against an unapproved NGO page at the database level, so a "failure" here can never be that specific case; if you see that error message, it's working as designed, not a bug.
2. No server-side "retry the same charge" exists by design (matches how real payment gateways work — a failed charge isn't safely retryable without the payer re-authorizing). Direct the donor to `DonateScreen` to try again.

## 4. Response — receipt failed

1. Call `services/compliance`'s reconcile endpoint (safe, idempotent — designed to be called on a schedule in production, and on-demand here):
   ```bash
   curl -X POST http://<compliance-service-host>/receipts/reconcile
   ```
2. Re-check `donations.receipt_status` and `receipt_attempts` — if it flipped to `'generated'`, done. If it's still failing after several `reconcile()` calls, this is no longer a transient/expected-mock-failure case — escalate to whoever owns the real receipt-generation vendor integration (not yet contracted in this build, same Phase-6-style gap as the payment provider itself).
3. **Never hand-edit `receipt_status` to `'generated'` without an actual receipt existing** — `receipt_url` is what the donor-facing UI links to; flipping the status without a real file behind it turns a recoverable failure into a support ticket where the donor clicks a broken link.

## 5. Post-incident

1. If a genuine (non-mock) vendor failure pattern emerges repeatedly, that's the signal to prioritize whatever Phase 6 left as a dummy-provider gap — contracting a real Razorpay account and/or receipt-generation service — rather than continuing to lean on manual `reconcile()` calls.
2. Any donation-flow bug fix should get a live re-verification pass through the mock provider's real failure branches (`fail_`-prefixed `clientPaymentId` for payment, the guaranteed-first-attempt-fails behavior for receipts) before being considered closed — these exist specifically so "does the retry path actually work" never has to be taken on faith.
