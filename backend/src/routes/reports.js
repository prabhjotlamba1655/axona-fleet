import express from 'express';
import { authenticate } from '../middleware/auth.js';
import ReportsService, { validate90DaysRange } from '../services/reportsService.js';

const router = express.Router();
router.use(authenticate);

// Helper to convert array of objects to CSV
function jsonToCSV(items) {
  if (!items || items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const rows = items.map(item => 
    headers.map(h => {
      let val = item[h];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return `"${val}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// GET /api/reports/:reportType - Query report data
router.get('/:reportType', (req, res) => {
  const { reportType } = req.params;
  let { vehicleId, startDate, endDate, exportFormat, preset } = req.query;
  const tenantId = req.user.tenant_id;

  // Handle Preset ranges
  if (preset) {
    const now = new Date();
    if (preset === 'today') {
      startDate = now.toISOString().split('T')[0] + ' 00:00:00';
      endDate = now.toISOString().split('T')[0] + ' 23:59:59';
    } else if (preset === '7days') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = d.toISOString().split('T')[0] + ' 00:00:00';
      endDate = now.toISOString().split('T')[0] + ' 23:59:59';
    } else if (preset === '30days') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = d.toISOString().split('T')[0] + ' 00:00:00';
      endDate = now.toISOString().split('T')[0] + ' 23:59:59';
    } else if (preset === '90days') {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate = d.toISOString().split('T')[0] + ' 00:00:00';
      endDate = now.toISOString().split('T')[0] + ' 23:59:59';
    }
  }

  // Validate 90-day maximum interval
  if (startDate && endDate) {
    const errorMsg = validate90DaysRange(startDate, endDate);
    if (errorMsg) {
      return res.status(400).json({ error: errorMsg, maxAllowedDays: 90 });
    }
  }

  let data = [];
  const filter = { vehicleId, startDate, endDate };

  switch (reportType) {
    case 'movement':
      data = ReportsService.getVehicleMovementReport(tenantId, filter);
      break;
    case 'trips':
      data = ReportsService.getTripHistoryReport(tenantId, filter);
      break;
    case 'distance':
      data = ReportsService.getDistanceTravelledReport(tenantId, filter);
      break;
    case 'overspeeding':
      data = ReportsService.getOverspeedingReport(tenantId, filter);
      break;
    case 'panic':
      data = ReportsService.getPanicButtonReport(tenantId, filter);
      break;
    case 'device-health':
      data = ReportsService.getDeviceHealthReport(tenantId, filter);
      break;
    case 'geofence':
      data = ReportsService.getGeofenceReport(tenantId, filter);
      break;
    case 'driver-intelligence':
      data = ReportsService.getDriverIntelligenceReport(tenantId, { ...filter, eventType: req.query.eventType });
      break;
    case 'immobilisation':
      data = ReportsService.getImmobilisationHistoryReport(tenantId, filter);
      break;
    default:
      return res.status(400).json({ error: `Unknown report type: ${reportType}` });
  }

  if (exportFormat === 'csv') {
    const csv = jsonToCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="axona_${reportType}_report_90d.csv"`);
    return res.send(csv);
  }

  res.json({
    reportType,
    dateRange: { startDate: startDate || null, endDate: endDate || null, maxDays: 90 },
    generatedAt: new Date().toISOString(),
    recordCount: data.length,
    data
  });
});

export default router;
