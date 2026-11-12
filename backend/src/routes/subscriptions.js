import express from 'express';
import db from '../db/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/subscriptions/current - Get tenant active subscription & usage
router.get('/current', (req, res) => {
  const { user } = req;
  const tenantId = user.tenant_id;

  const sub = db.get(`
    SELECT s.*, p.name as plan_name, p.code as plan_code, p.billing_period,
           p.price_per_vehicle, p.max_vehicles, p.features_json
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.tenant_id = ?
  `, [tenantId]);

  const activeVehicles = db.get(`
    SELECT COUNT(id) as count FROM vehicles WHERE tenant_id = ? AND is_active = 1
  `, [tenantId]);

  const payments = db.query(`
    SELECT * FROM payments WHERE tenant_id = ? ORDER BY paid_at DESC
  `, [tenantId]);

  const plans = db.query('SELECT * FROM subscription_plans ORDER BY price_per_vehicle ASC');

  res.json({
    subscription: sub || null,
    vehicleUsage: {
      activeVehicles: activeVehicles ? activeVehicles.count : 0,
      licensedVehicles: sub ? sub.vehicle_count : 5
    },
    payments,
    availablePlans: plans
  });
});

// POST /api/subscriptions/upgrade - Upgrade subscription plan
router.post('/upgrade', authorize(['super_admin', 'company_admin']), (req, res) => {
  const { plan_id, vehicle_count } = req.body;
  const tenantId = req.user.tenant_id;

  const plan = db.get('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
  if (!plan) {
    return res.status(404).json({ error: 'Subscription plan not found' });
  }

  const count = vehicle_count || 5;
  const amount = plan.price_per_vehicle * count;
  const invoiceNum = `INV-AXONA-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  // Update subscription
  db.run(`
    INSERT INTO subscriptions (id, tenant_id, plan_id, vehicle_count, status, start_date, end_date)
    VALUES (?, ?, ?, ?, 'active', date('now'), date('now', '+365 days'))
    ON CONFLICT(tenant_id) DO UPDATE SET
      plan_id = excluded.plan_id,
      vehicle_count = excluded.vehicle_count,
      status = 'active',
      end_date = excluded.end_date
  `, [`sub_${tenantId}`, tenantId, plan.id, count]);

  // Insert payment record
  const payId = `pay_${Date.now()}`;
  db.run(`
    INSERT INTO payments (id, tenant_id, subscription_id, invoice_number, amount, currency, status)
    VALUES (?, ?, ?, ?, ?, 'INR', 'paid')
  `, [payId, tenantId, `sub_${tenantId}`, invoiceNum, amount]);

  res.json({
    message: `Upgraded to ${plan.name} successfully`,
    invoiceNumber: invoiceNum,
    amount
  });
});

// GET /api/subscriptions/plans - Global plans list
router.get('/plans', (req, res) => {
  const plans = db.query('SELECT * FROM subscription_plans ORDER BY price_per_vehicle ASC');
  res.json(plans);
});

export default router;
