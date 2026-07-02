import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import * as dbQueries from '../models/queries.js';
import { createAuditLog } from '../services/audit.js';

const router = Router();

// Require authenticated user for all reports routes
router.use(authenticateToken);

// Helper to simulate sending email
function simulateEmail(to: string, subject: string, body: string) {
  console.log(`[EMAIL SENT TO ${to}]`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log('-----------------------------------------');
}

/**
 * POST /api/reports
 * Submit a report
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { report_type, subject_contact_id, subject_property_id, subject_user_id, description, evidence_urls } = req.body;
    const reporterId = req.user!.user_id;

    // Validate report type
    const validTypes = [
      'Suspicious landlord',
      'Suspicious caretaker', 
      'Fake listing',
      'Scam attempt',
      'Harassment',
      'Property mismatch',
      'Unauthorized fee request',
      'Other'
    ];
    if (!report_type || !validTypes.includes(report_type)) {
      res.status(400).json({ error: 'Invalid or missing report type.' });
      return;
    }

    // Validate description length
    if (!description || description.length < 20 || description.length > 1000) {
      res.status(400).json({ error: 'Description must be between 20 and 1000 characters.' });
      return;
    }

    // Determine initial status based on report type
    // If Scam attempt or Harassment -> 'Under Review', otherwise 'Pending'
    const initialStatus = (report_type === 'Scam attempt' || report_type === 'Harassment') 
      ? 'Under Review' 
      : 'Pending';

    // Create report in DB
    const report = await dbQueries.createReport(
      reporterId,
      report_type,
      subject_contact_id || null,
      subject_property_id || null,
      subject_user_id || null,
      description,
      evidence_urls || [],
      initialStatus
    );

    if (!report) {
      res.status(500).json({ error: 'Failed to create report.' });
      return;
    }

    // 1. Log event in audit_log
    await createAuditLog(reporterId, 'REPORT_SUBMITTED', {
      report_id: report.report_id,
      report_type: report.report_type
    });

    // 2. Scam attempt or Harassment email notification
    if (report_type === 'Scam attempt' || report_type === 'Harassment') {
      const emailBody = `
        Hello,
        A new urgent safety report of type "${report_type}" has been submitted on Lodga.
        
        Report Reference: ${report.report_id}
        Initial Status: ${initialStatus}
        
        Description:
        ${description}
        
        Subject Details:
        - Contact ID: ${subject_contact_id || 'N/A'}
        - Property ID: ${subject_property_id || 'N/A'}
        - Subject User ID: ${subject_user_id || 'N/A'}
        
        Confidential Reporter User ID: ${reporterId}
        Evidence Photos: ${evidence_urls && evidence_urls.length ? evidence_urls.join(', ') : 'None'}
      `;
      simulateEmail('nglodga@gmail.com', `[URGENT] New ${report_type} Safety Report Submitted`, emailBody);
    }

    // 3. Threshold check: 3 or more Pending/Under Review reports for contact_id or property_id
    if (subject_contact_id) {
      const count = await dbQueries.getReportsCountForSubject(subject_contact_id, null);
      if (count >= 3) {
        // Flag contact
        await dbQueries.flagContact(subject_contact_id, true);
        // Send notification email
        const adminEmailBody = `
          Hello,
          The contact "${subject_contact_id}" has reached 3 or more active safety reports (Pending or Under Review).
          This contact has been automatically flagged in the database. Please review this contact urgently on the admin panel.
          
          Contact ID: ${subject_contact_id}
          Current Active Reports Count: ${count}
        `;
        simulateEmail('nglodga@gmail.com', `[CRITICAL] Contact ${subject_contact_id} Automatically Flagged`, adminEmailBody);
      }
    }

    if (subject_property_id) {
      const count = await dbQueries.getReportsCountForSubject(null, subject_property_id);
      if (count >= 3) {
        // Flag property
        await dbQueries.flagProperty(subject_property_id, true);
        // Send notification email
        const adminEmailBody = `
          Hello,
          The property listed as "${subject_property_id}" has reached 3 or more active safety reports (Pending or Under Review).
          This property has been automatically flagged in the database. Please review this property urgently on the admin panel.
          
          Property ID: ${subject_property_id}
          Current Active Reports Count: ${count}
        `;
        simulateEmail('nglodga@gmail.com', `[CRITICAL] Property ${subject_property_id} Automatically Flagged`, adminEmailBody);
      }
    }

    res.status(201).json(report);
  } catch (error) {
    console.error('Submit report endpoint error:', error);
    res.status(500).json({ error: 'Failed to process report.' });
  }
});

/**
 * GET /api/reports/my
 * Get reports submitted by current user
 */
router.get('/my', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reporterId = req.user!.user_id;
    const reports = await dbQueries.getReportsByReporter(reporterId);

    // Sanitize reports to hide admin actions or notes and reporter_id
    const sanitizedReports = reports.map(r => {
      const copy = { ...r };
      delete copy.admin_notes;
      delete copy.reporter_id;
      return copy;
    });

    res.status(200).json(sanitizedReports);
  } catch (error) {
    console.error('Fetch my reports error:', error);
    res.status(500).json({ error: 'Failed to retrieve your reports ledger.' });
  }
});

export default router;
