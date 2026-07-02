import * as dbQueries from '../models/queries.js';
import { releaseEscrowToLandlord } from '../services/businessLogic.js';

/**
 * Sweeps properties facing imminent lease expirations (within 21 days) and triggers WhatsApp caretaker renewal pings.
 */
export async function checkCaretakerRenewalPings(): Promise<any[]> {
  console.log('[CRON] Sweeping listings for caretakers lease renewal check...');
  const properties = await dbQueries.getProperties({});
  const now = new Date();
  const warningHorizon = 21 * 24 * 60 * 60 * 1000; // 21 days in ms
  const loggedPings = [];

  for (const prop of properties) {
    if (!prop.lease_expiry_estimate) continue;

    const expiryDate = new Date(prop.lease_expiry_estimate);
    const diffTime = expiryDate.getTime() - now.getTime();

    // If within 21 days warning horizon and currently marked as Taken
    if (diffTime > 0 && diffTime <= warningHorizon && prop.availability === 'Taken') {
      // Check if we already sent a renewal ping in the last 7 days
      const existing = await dbQueries.getRenewalPingsForProperty(prop.property_id);
      const recentlySent = existing.some((ping) => {
        const pingSentDate = new Date(ping.ping_sent_at);
        return now.getTime() - pingSentDate.getTime() < 7 * 24 * 60 * 60 * 1000;
      });

      if (!recentlySent) {
        const ping = await dbQueries.createRenewalPing(prop.property_id, prop.caretaker_id);
        console.log(`[WhatsApp Renewal Alert] Pinging caretaker ${prop.caretaker_id} about property ${prop.property_id}. expiry estimated: ${prop.lease_expiry_estimate}.`);
        loggedPings.push(ping);
      }
    }
  }
  return loggedPings;
}

/**
 * Searches transactions where 48 hours have elapsed since move_in_date, and auto-releases the escrow if no dispute is logged.
 */
export async function checkAutoReleaseEscrow(): Promise<any[]> {
  console.log('[CRON] Initiating 48-hour move-in escrow release pass...');
  const transactions = await dbQueries.getTransactions('admin', '');
  const now = new Date();
  const autoReleased = [];

  for (const tx of transactions) {
    if (tx.escrow_status !== 'Held') continue;

    // Calculate elapsed time from move-in date
    const moveInDateObj = new Date(tx.move_in_date);
    const diffHours = (now.getTime() - moveInDateObj.getTime()) / (1000 * 60 * 60);

    // Auto-release after 48hr window if no dispute
    if (diffHours >= 48 && tx.dispute_status === 'No') {
      const releaseResult = await releaseEscrowToLandlord(tx.transaction_id);
      if (releaseResult.success) {
        console.log(`[Auto Escrow Release] Transaction ${tx.transaction_id} successfully finalized. 48 hour disputation window closed.`);
        autoReleased.push(tx);
      }
    }
  }
  return autoReleased;
}
