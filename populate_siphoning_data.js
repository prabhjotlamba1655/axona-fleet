const path = require('path');
const sqlite3 = require(path.join(__dirname, 'backend', 'node_modules', 'sqlite3')).verbose();

const dbPath = path.join(__dirname, 'backend', 'axona_fleet.db');
const db = new sqlite3.Database(dbPath);

function getOffsetDateStr(daysAgo, timeStr = '10:30') {
  const d = new Date(Date.now() - daysAgo * 86400000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${timeStr}`;
}

const siphons = [
  {
    id: 'SIPH-501',
    vehicle_id: 'VH-102',
    reg_no: 'DL-01-AX-9021',
    detected_time: getOffsetDateStr(0, '04:15'),
    moved_15m_time: getOffsetDateStr(0, '04:30'),
    siphoned_liters: 28.5,
    estimated_loss_inr: 2679.0,
    location_name: 'NH48 Dhaba km 142, Kotputli, RJ',
    lat: 27.7011,
    lng: 76.2023,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-502',
    vehicle_id: 'VH-104',
    reg_no: 'GJ-06-ZZ-7711',
    detected_time: getOffsetDateStr(1, '23:15'),
    moved_15m_time: getOffsetDateStr(1, '23:30'),
    siphoned_liters: 14.0,
    estimated_loss_inr: 1316.0,
    location_name: 'GIDC Bypass Roadside Hotel, Ankleshwar',
    lat: 21.6264,
    lng: 72.9991,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-503',
    vehicle_id: 'VH-107',
    reg_no: 'UP-32-HN-1244',
    detected_time: getOffsetDateStr(2, '18:40'),
    moved_15m_time: getOffsetDateStr(2, '18:55'),
    siphoned_liters: 22.0,
    estimated_loss_inr: 2068.0,
    location_name: 'Lucknow Ring Road Toll Oasis Dhaba',
    lat: 26.8467,
    lng: 80.9462,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-504',
    vehicle_id: 'VH-101',
    reg_no: 'MH-12-RN-8842',
    detected_time: getOffsetDateStr(4, '02:25'),
    moved_15m_time: getOffsetDateStr(4, '02:40'),
    siphoned_liters: 18.5,
    estimated_loss_inr: 1739.0,
    location_name: 'Samruddhi Expressway Rest Bay km 184',
    lat: 19.8762,
    lng: 75.3433,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-505',
    vehicle_id: 'VH-103',
    reg_no: 'KA-04-MB-4190',
    detected_time: getOffsetDateStr(5, '21:50'),
    moved_15m_time: getOffsetDateStr(5, '22:05'),
    siphoned_liters: 25.0,
    estimated_loss_inr: 2350.0,
    location_name: 'Hosur Border Highway Truck Layby',
    lat: 12.7409,
    lng: 77.8253,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-506',
    vehicle_id: 'VH-105',
    reg_no: 'HR-55-AK-3004',
    detected_time: getOffsetDateStr(6, '14:10'),
    moved_15m_time: getOffsetDateStr(6, '14:25'),
    siphoned_liters: 16.5,
    estimated_loss_inr: 1551.0,
    location_name: 'Neemrana Japanese Zone Flyover Service Lane',
    lat: 27.9942,
    lng: 76.3882,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-507',
    vehicle_id: 'VH-106',
    reg_no: 'AP-16-TX-5509',
    detected_time: getOffsetDateStr(8, '03:40'),
    moved_15m_time: getOffsetDateStr(8, '03:55'),
    siphoned_liters: 14.0,
    estimated_loss_inr: 1288.0,
    location_name: 'Eluru Bypass Truck Bay, NH16, AP',
    lat: 16.7107,
    lng: 81.0952,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-508',
    vehicle_id: 'VH-108',
    reg_no: 'WB-19-DF-4402',
    detected_time: getOffsetDateStr(10, '01:20'),
    moved_15m_time: getOffsetDateStr(10, '01:35'),
    siphoned_liters: 11.5,
    estimated_loss_inr: 1058.0,
    location_name: 'Kolaghat NH116 Bridge Rest Point',
    lat: 22.4277,
    lng: 87.8727,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-509',
    vehicle_id: 'VH-109',
    reg_no: 'RJ-14-GH-6621',
    detected_time: getOffsetDateStr(12, '22:50'),
    moved_15m_time: getOffsetDateStr(12, '23:05'),
    siphoned_liters: 9.5,
    estimated_loss_inr: 874.0,
    location_name: 'Kishangarh Marble Area Layby km 92',
    lat: 26.5746,
    lng: 74.8654,
    verified_after_15min_move: 1
  },
  {
    id: 'SIPH-510',
    vehicle_id: 'VH-110',
    reg_no: 'TN-09-BK-9182',
    detected_time: getOffsetDateStr(15, '20:15'),
    moved_15m_time: getOffsetDateStr(15, '20:30'),
    siphoned_liters: 6.0,
    estimated_loss_inr: 552.0,
    location_name: 'Kanchipuram Outer Ring Toll Bay',
    lat: 12.8342,
    lng: 79.7036,
    verified_after_15min_move: 1
  }
];

db.serialize(() => {
  db.run('DELETE FROM siphoning_events');
  const stmt = db.prepare(`INSERT INTO siphoning_events (
    id, vehicle_id, reg_no, detected_time, moved_15m_time, siphoned_liters, estimated_loss_inr, location_name, lat, lng, verified_after_15min_move
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  siphons.forEach(s => {
    stmt.run(s.id, s.vehicle_id, s.reg_no, s.detected_time, s.moved_15m_time, s.siphoned_liters, s.estimated_loss_inr, s.location_name, s.lat, s.lng, s.verified_after_15min_move);
  });
  stmt.finalize(() => {
    db.all('SELECT count(*) as total, sum(siphoned_liters) as liters FROM siphoning_events', (err, rows) => {
      console.log('Siphoning Events Seeded:', rows);
      db.close();
    });
  });
});
