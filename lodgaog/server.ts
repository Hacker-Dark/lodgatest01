import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Routes
import authRouter from './backend/src/routes/auth.js';
import listingsRouter from './backend/src/routes/listings.js';
import transactionsRouter from './backend/src/routes/transactions.js';
import caretakerRouter from './backend/src/routes/caretaker.js';
import adminRouter from './backend/src/routes/admin.js';
import reportsRouter from './backend/src/routes/reports.js';

// Cron triggers
import { checkCaretakerRenewalPings, checkAutoReleaseEscrow } from './backend/src/jobs/cron.js';

// Local DB State for testing console logs
import { localDB } from './backend/src/config/db.js';
import * as dbQueries from './backend/src/models/queries.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const app: Express = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Debug logger
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
  });

  // Central CORS / Headers for direct sandbox security support
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // RESTful API routers
  app.use('/api/auth', authRouter);
  app.use('/api/listings', listingsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/caretaker', caretakerRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/reports', reportsRouter);

  // Simulation endpoints for interactive workspace testing
  app.post('/api/simulator/cron/renewals', async (req: Request, res: Response) => {
    try {
      const pings = await checkCaretakerRenewalPings();
      res.status(200).json({ message: 'Renewal sweep trigger complete.', pingsCount: pings.length, pings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/simulator/cron/escrow', async (req: Request, res: Response) => {
    try {
      const autoReleased = await checkAutoReleaseEscrow();
      res.status(200).json({ message: 'Escrow sweep trigger complete.', releasedCount: autoReleased.length, autoReleased });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/simulator/db', (req: Request, res: Response) => {
    res.status(200).json(localDB);
  });

  app.post('/api/properties', async (req: Request, res: Response) => {
    try {
      const newProperty = await dbQueries.createProperty(req.body);
      res.status(201).json({
        message: 'Property uploaded successfully.',
        property: newProperty
      });
    } catch (err: any) {
      console.error('Explicit api/properties Error:', err);
      res.status(500).json({ error: err.message || 'Failed listing' });
    }
  });

  app.post('/api/simulator/db/reset', (req: Request, res: Response) => {
    // Restore primary seed parameters
    localDB.transactions = [
      {
        transaction_id: 'TXN-001',
        property_id: 'PROP-102',
        student_id: 'a0000000-0000-0000-0000-000000000001',
        landlord_rent: 140000.00,
        connection_fee: 12000.00,
        inspection_fee: 3000.00,
        total_paid: 155000.00,
        paystack_reference: 'PSTK_REF_998877',
        payment_date: new Date('2026-06-18T10:00:00Z'),
        move_in_date: '2026-06-21',
        escrow_status: 'Held',
        dispute_status: 'No',
        inspection_waiver: false,
        feedback_received: false,
        created_at: new Date('2026-06-18T09:45:00Z'),
        updated_at: new Date('2026-06-18T10:00:00Z')
      }
    ];
    localDB.properties = localDB.properties.map(p => {
      if (p.property_id === 'PROP-101' || p.property_id === 'PROP-102') {
        p.availability = 'Available';
      } else {
        p.availability = 'Under Verification';
      }
      return p;
    });
    localDB.verification_checks = [
      {
        check_id: 'v0000001-0000-0000-0000-000000000001',
        property_id: 'PROP-101',
        caretaker_id: 'LLC-001',
        visit_date: '2026-06-01',
        item_1_physical_visit: 'Pass',
        item_2_photos: 'Pass',
        item_3_id_verified: 'Pass',
        item_4_ownership: 'Pass',
        item_5_pricing: 'Pass',
        item_6_amenities: 'Pass',
        item_7_feedback: 'Pass',
        overall_status: 'Passed',
        notes: 'All features check out. Water pump active.',
        created_at: new Date('2026-06-01'),
        updated_at: new Date('2026-06-01')
      },
      {
        check_id: 'v0000001-0000-0000-0000-000000000002',
        property_id: 'PROP-102',
        caretaker_id: 'LLC-002',
        visit_date: '2026-06-03',
        item_1_physical_visit: 'Pass',
        item_2_photos: 'Pass',
        item_3_id_verified: 'Pass',
        item_4_ownership: 'Pass',
        item_5_pricing: 'Pass',
        item_6_amenities: 'Pass',
        item_7_feedback: 'Pass',
        overall_status: 'Passed',
        notes: 'Passed initial inspections.',
        created_at: new Date('2026-06-03'),
        updated_at: new Date('2026-06-03')
      },
      {
        check_id: 'v0000001-0000-0000-0000-000000000003',
        property_id: 'PROP-103',
        caretaker_id: 'LLC-001',
        visit_date: '2026-06-15',
        item_1_physical_visit: 'Pending',
        item_2_photos: 'Pending',
        item_3_id_verified: 'Pending',
        item_4_ownership: 'Pending',
        item_5_pricing: 'Pending',
        item_6_amenities: 'Pending',
        item_7_feedback: 'Pending',
        overall_status: 'Incomplete',
        notes: 'Initial check slated for next Tuesday.',
        created_at: new Date('2026-06-15'),
        updated_at: new Date('2026-06-15')
      }
    ];
    localDB.caretaker_renewal_pings = [];
    res.status(200).json({ message: 'Simulation dataset restored to initial seed configurations.', db: localDB });
  });

  // Live client feedback Paystack payment simulator page fallback
  app.get('/payment-callback', (req: Request, res: Response) => {
    const reference = req.query.ref as string;
    // Auto-approve the mock transaction details to let the user simulate web payments!
    const txIndex = localDB.transactions.findIndex(t => t.paystack_reference === reference);
    if (txIndex !== -1) {
      localDB.transactions[txIndex].escrow_status = 'Held';
      localDB.transactions[txIndex].payment_date = new Date();
      // Set the linked property to "Taken" automatically
      const propIndex = localDB.properties.findIndex(p => p.property_id === localDB.transactions[txIndex].property_id);
      if (propIndex !== -1) {
        localDB.properties[propIndex].availability = 'Taken';
      }
    }

    res.send(`
      <html>
        <head>
          <title>Paystack Sandbox Simulator</title>
          <style>
            body { font-family: system-ui; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); text-align: center; max-width: 400px; }
            h1 { color: #22c55e; margin-top: 0; }
            p { color: #94a3b8; }
            .btn { background: #10b981; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 1.5rem; }
            .btn:hover { background: #059669; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>₦ Success!</h1>
            <p>Paystack Sandbox payment simulation complete.</p>
            <p>Reference: <strong>${reference}</strong></p>
            <p>The property has been successfully reserved in our registry and the caretaker contact has been unlocked.</p>
            <button onclick="window.close()" class="btn">Return to Lodga App</button>
          </div>
        </body>
      </html>
    `);
  });

  // Vite middleware for development or fallback static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Lodga Full-Stack engine running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap full-stack server application:', err);
});
