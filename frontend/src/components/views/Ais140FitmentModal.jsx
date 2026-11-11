import React, { useState } from 'react';
import { 
  FileCheck, X, Printer, Download, CheckCircle2, 
  QrCode, ShieldCheck, Truck, RefreshCw, ExternalLink
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Ais140FitmentModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const vehicles = [
    {
      reg_no: 'MH-12-RN-8842',
      id: 'VH-101',
      model: 'Tata Prima 5530.S (18-Wheeler Tractor)',
      chassis_no: 'MAT748291M2049182',
      engine_no: 'E483TI2026B819',
      make: 'Tata Motors',
      rto: 'MH-12 Pune RTO',
      imei: '864920048192041',
      sim_iccid: '8991000924192847291F',
      tac_no: 'ARAI/TAC/2026/VLTD-9481',
      cop_valid_upto: '31/12/2027',
      fitment_date: '14/01/2026',
      device_model: 'Axona NavIC VLTD v4.2 (AIS-140 Certified)',
      certifier: 'Axona Authorized Fitment Centre #MH-042',
      vahan_status: 'VAHAN_ACTIVE'
    },
    {
      reg_no: 'DL-01-AB-1234',
      id: 'VH-102',
      model: 'BharatBenz 3528R (12-Wheeler Reefer)',
      chassis_no: 'MEC820194K1920481',
      engine_no: 'OM926LA2026A102',
      make: 'Daimler India Commercial',
      rto: 'DL-01 Mall Road RTO, Delhi',
      imei: '864920048192042',
      sim_iccid: '8991000924192847292F',
      tac_no: 'ICAT/TAC/2025/VLTD-8120',
      cop_valid_upto: '30/06/2027',
      fitment_date: '08/02/2026',
      device_model: 'Axona NavIC VLTD v4.2 (AIS-140 Certified)',
      certifier: 'Axona Authorized Fitment Centre #DL-001',
      vahan_status: 'VAHAN_ACTIVE'
    },
    {
      reg_no: 'KA-04-E-5678',
      id: 'VH-103',
      model: 'Ashok Leyland 4220 HG (14-Wheeler)',
      chassis_no: 'MAL910283H4910283',
      engine_no: 'H6ETIC2026C401',
      make: 'Ashok Leyland',
      rto: 'KA-04 Yeshwanthpur RTO, Bangalore',
      imei: '864920048192043',
      sim_iccid: '8991000924192847293F',
      tac_no: 'ARAI/TAC/2026/VLTD-9481',
      cop_valid_upto: '31/12/2027',
      fitment_date: '20/01/2026',
      device_model: 'Axona NavIC VLTD v4.2 (AIS-140 Certified)',
      certifier: 'Axona Authorized Fitment Centre #KA-018',
      vahan_status: 'VAHAN_ACTIVE'
    },
    {
      reg_no: 'HR-55-B-4321',
      id: 'VH-104',
      model: 'Mahindra Blazo X 35 (12-Wheeler Cargo)',
      chassis_no: 'MA1829104P8201948',
      engine_no: 'mPOWER7.2L2026D9',
      make: 'Mahindra & Mahindra',
      rto: 'HR-55 Gurgaon Commercial RTO',
      imei: '864920048192044',
      sim_iccid: '8991000924192847294F',
      tac_no: 'ICAT/TAC/2025/VLTD-8120',
      cop_valid_upto: '30/06/2027',
      fitment_date: '12/03/2026',
      device_model: 'Axona NavIC VLTD v4.2 (AIS-140 Certified)',
      certifier: 'Axona Authorized Fitment Centre #HR-009',
      vahan_status: 'VAHAN_ACTIVE'
    },
    {
      reg_no: 'UP-32-HN-1244',
      id: 'VH-107',
      model: 'Tata Signa 2823.K (10-Wheeler Tipper)',
      chassis_no: 'MAT910284L4019281',
      engine_no: 'CUMMINS5.6L2026X',
      make: 'Tata Motors',
      rto: 'UP-32 Transport Nagar RTO, Lucknow',
      imei: '864920048192047',
      sim_iccid: '8991000924192847297F',
      tac_no: 'ARAI/TAC/2026/VLTD-9481',
      cop_valid_upto: '31/12/2027',
      fitment_date: '05/02/2026',
      device_model: 'Axona NavIC VLTD v4.2 (AIS-140 Certified)',
      certifier: 'Axona Authorized Fitment Centre #UP-014',
      vahan_status: 'VAHAN_ACTIVE'
    }
  ];

  const [selectedReg, setSelectedReg] = useState('MH-12-RN-8842');
  const selectedVehicle = vehicles.find(v => v.reg_no === selectedReg) || vehicles[0];

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    alert(`Downloading official Form 22 AIS-140 Fitment Certificate PDF for ${selectedVehicle.reg_no}...`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans ${
        isLight ? 'bg-white border-amber-300' : 'bg-[#080E24] border-amber-600/60 shadow-[0_0_50px_rgba(245,158,11,0.25)]'
      }`}>
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950 via-[#1C1508] to-amber-900 border-b border-amber-500/50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-lg">
              <FileCheck size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-['Chakra_Petch']">
                  AIS-140 VLTD Fitment Certificate Generator (Form 22)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-950">
                  MoRTH / Vahan 4.0
                </span>
              </div>
              <p className="text-xs text-amber-200/90 font-mono mt-0.5">
                Statutory certificate with verifiable QR code required for RTO Annual Fitness & National Permit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Vehicle Selector Toolbar */}
        <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B1533] border-slate-800'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-semibold">Select Vehicle:</span>
            <select
              value={selectedReg}
              onChange={(e) => setSelectedReg(e.target.value)}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-amber-500/60 text-amber-300 font-bold font-mono text-xs focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              {vehicles.map(v => (
                <option key={v.reg_no} value={v.reg_no}>
                  {v.reg_no} — {v.model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Print Form 22</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center space-x-1.5 shadow-md transition cursor-pointer"
            >
              <Download size={13} />
              <span>Download PDF Certificate</span>
            </button>
          </div>
        </div>

        {/* Printable Certificate Preview Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60 flex justify-center">
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-xl p-6 sm:p-8 shadow-2xl border-4 border-double border-slate-300 font-serif relative">
            
            {/* Top Seal & Heading */}
            <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
              <div className="text-[10px] uppercase font-sans tracking-widest text-slate-600 font-bold">
                Government of India • Ministry of Road Transport & Highways (MoRTH)
              </div>
              <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-950 mt-1">
                AIS-140 Vehicle Location Tracking Device (VLTD)
              </h1>
              <div className="text-sm font-semibold uppercase text-slate-700 font-sans tracking-wide">
                Fitment & Verification Certificate (Form 22)
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                Issued in Compliance with Central Motor Vehicles Rules (CMVR) Rule 125H & AIS-140 Standard
              </div>
            </div>

            {/* Certificate Body */}
            <div className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Certificate Serial No.</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">AXN-VLTD-2026-{selectedVehicle.reg_no.replace(/-/g, '')}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Fitment Date</span>
                  <span className="font-mono font-bold text-slate-900">{selectedVehicle.fitment_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-mono">Vahan 4.0 Status</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Active / Synced
                  </span>
                </div>
              </div>

              {/* Vehicle & Device Specs 2-Column Table */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-b border-slate-200 py-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Vehicle Registration No:</span>
                  <b className="font-mono text-sm text-slate-950">{selectedVehicle.reg_no}</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Registering Authority (RTO):</span>
                  <b className="text-slate-950">{selectedVehicle.rto}</b>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Chassis Number:</span>
                  <b className="font-mono text-slate-900">{selectedVehicle.chassis_no}</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Engine Number:</span>
                  <b className="font-mono text-slate-900">{selectedVehicle.engine_no}</b>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Vehicle Make & Model:</span>
                  <span className="text-slate-900 font-semibold">{selectedVehicle.model}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">VLTD Device Model:</span>
                  <span className="text-slate-900 font-semibold">{selectedVehicle.device_model}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Device IMEI Number:</span>
                  <b className="font-mono text-slate-900">{selectedVehicle.imei}</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Embedded e-SIM ICCID:</span>
                  <b className="font-mono text-slate-900">{selectedVehicle.sim_iccid}</b>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">TAC Approval Number:</span>
                  <b className="font-mono text-slate-900">{selectedVehicle.tac_no}</b>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">COP Validity:</span>
                  <b className="font-mono text-emerald-700">{selectedVehicle.cop_valid_upto}</b>
                </div>
              </div>

              {/* Panic Button Declaration */}
              <div className="text-[11px] text-slate-700 leading-relaxed bg-amber-50/70 p-2.5 rounded border border-amber-200">
                <b>Statutory Declaration:</b> Certified that the VLTD device and <b>Two (2) In-Cabin Emergency Panic Buttons</b> have been physically installed, calibrated, and verified on vehicle <b>{selectedVehicle.reg_no}</b>. Device successfully transmits dual-IP telemetry to both State Police ERSS 112 Command and TSP Servers in compliance with AIS-140 Part I & II.
              </div>

              {/* Bottom Verification QR Code and Signatures */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center space-x-3">
                  {/* SVG Scannable QR Code */}
                  <div className="p-1.5 border-2 border-slate-900 rounded bg-white">
                    <svg className="w-16 h-16" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="0" y="0" width="30" height="30" fill="#000" />
                      <rect x="5" y="5" width="20" height="20" fill="#fff" />
                      <rect x="10" y="10" width="10" height="10" fill="#000" />
                      
                      <rect x="70" y="0" width="30" height="30" fill="#000" />
                      <rect x="75" y="5" width="20" height="20" fill="#fff" />
                      <rect x="80" y="10" width="10" height="10" fill="#000" />

                      <rect x="0" y="70" width="30" height="30" fill="#000" />
                      <rect x="5" y="75" width="20" height="20" fill="#fff" />
                      <rect x="10" y="80" width="10" height="10" fill="#000" />

                      <rect x="35" y="10" width="10" height="10" fill="#000" />
                      <rect x="50" y="20" width="15" height="10" fill="#000" />
                      <rect x="35" y="35" width="30" height="30" fill="#000" />
                      <rect x="40" y="40" width="20" height="20" fill="#fff" />
                      <rect x="70" y="45" width="15" height="15" fill="#000" />
                      <rect x="70" y="70" width="25" height="25" fill="#000" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Vahan 4.0 Scan Payload</span>
                    <span className="text-[10px] font-mono text-slate-800 font-bold">Scan to verify on Vahan Portal</span>
                    <span className="text-[9px] text-emerald-700 block font-mono font-semibold">✓ Cryptographic Digital Signature</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900 text-xs">For {selectedVehicle.certifier}</div>
                  <div className="text-[10px] text-slate-500 mt-4 border-t border-slate-400 pt-1">
                    Authorized Signatory & Seal
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs font-mono shrink-0 ${
          isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#060B18] text-slate-400 border-slate-800'
        }`}>
          <span>
            Certificate Format: <b>MoRTH / CMVR Form 22 AIS-140 Standard</b>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}
