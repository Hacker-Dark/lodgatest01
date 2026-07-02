import * as queries from '../models/queries.js';

/**
 * Calculates pricing for a listing based on the landlord's rent.
 * Connection fee is 8% of landlord rent with a minimum floor of N12,000.
 */
export function calculatePricing(landlordRent: number) {
  const connectionFee = Math.max(landlordRent * 0.08, 12000.0);
  const totalListedPrice = landlordRent + connectionFee;
  return {
    landlordRent,
    connectionFee,
    totalListedPrice
  };
}

/**
 * STRIPS sensitive landlord rent and connection fee data from listings
 * returned to students. This is a critical regulatory data constraint.
 */
export function sanitizePropertyForStudent(property: any) {
  if (!property) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { landlord_rent, connection_fee, ...studentSafeProperty } = property;
  return studentSafeProperty;
}

export function sanitizePropertiesForStudent(properties: any[]) {
  return properties.map(sanitizePropertyForStudent);
}

/**
 * Verifies if a property satisfies all 8 physical verification steps.
 * All items must equal 'Pass' or 'N/A' (N/A allowed with override).
 */
export function isVerificationCheckPassed(check: any): boolean {
  if (!check) return false;

  const steps = [
    check.item_1_physical_visit,
    check.item_2_photos,
    check.item_3_id_verified,
    check.item_4_ownership,
    check.item_5_pricing,
    check.item_6_amenities,
    check.item_7_feedback,
    check.item_8_location_pinned
  ];

  return steps.every(status => status === 'Pass' || status === 'N/A');
}

/**
 * Enforces the physical verification status gate BEFORE a property can go live.
 */
export async function enforceVerificationGate(propertyId: string): Promise<{ success: boolean; message: string }> {
  const check = await queries.getVerificationCheckForProperty(propertyId);
  if (!check) {
    return {
      success: false,
      message: 'Property has never been visited or physical check file does not exist.'
    };
  }

  const passed = isVerificationCheckPassed(check);
  if (!passed) {
    return {
      success: false,
      message: `Verification check is Incomplete or Failed. Cannot activate listing. Overall checklist status: ${check.overall_status}.`
    };
  }

  return { success: true, message: 'All 8 physical checks passed.' };
}

/**
 * Process escrow release logic. Idempotent to prevent double releases or double refunds.
 */
export async function releaseEscrowToLandlord(transactionId: string): Promise<{ success: boolean; message: string }> {
  const tx = await queries.findTransactionById(transactionId);
  if (!tx) {
    return { success: false, message: 'Transaction not found.' };
  }

  if (tx.escrow_status !== 'Held') {
    return {
      success: false,
      message: `Escrow cannot be released. Current status is already [${tx.escrow_status}].`
    };
  }

  // Update escrow to Released
  await queries.updateTransactionEscrow(transactionId, 'Released');

  // Trigger Paystack automated payout/transfer to caretaker account (simulated or API based)
  console.log(`[ESCROW] Disbursing landlord rent of N${tx.landlord_rent} to caretaker for transaction ${transactionId}. Connection fee of N${tx.connection_fee} retained by Lodga.`);

  return {
    success: true,
    message: `Escrow released successfully. Landlord rent portion of N${tx.landlord_rent} dispatched.`
  };
}

/**
 * Process escrow refund to student. Connection fee is NEVER refunded, only the rent portion is.
 */
export async function processRefundToStudent(transactionId: string): Promise<{ success: boolean; message: string }> {
  const tx = await queries.findTransactionById(transactionId);
  if (!tx) {
    return { success: false, message: 'Transaction not found.' };
  }

  if (tx.escrow_status !== 'Held' && tx.escrow_status !== 'Disputed') {
    return {
      success: false,
      message: `Refund failed. Escrow status is already [${tx.escrow_status}].`
    };
  }

  // Set transaction escrow status to Refunded
  await queries.updateTransactionEscrow(transactionId, 'Refunded');

  console.log(`[ESCROW] Refund processed for transaction ${transactionId}. Refunded landlord rent portion (N${tx.landlord_rent}) to student ${tx.student_id}. Connection fee (N${tx.connection_fee}) retained by Lodga.`);

  return {
    success: true,
    message: `Student refund issued successfully. Landlord rent of N${tx.landlord_rent} returned. Connection fee retained.`
  };
}
