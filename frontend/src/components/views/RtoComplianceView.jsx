import React, { useState, useEffect } from 'react';
import { FileCheck, ShieldAlert, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { fetchRtoCompliance } from '../../services/api';


const formatDateDDMMYYYY = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str;
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (isoMatch) {
    const [, yyyy, mm, dd, rest] = isoMatch;
    return `${dd}/${mm}/${yyyy}${rest}`;
  }
  return str;
};

export default function RtoComplianceView() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRtoCompliance().then(data => {
      setRecords(data);
      setLoading(false);
    }).catch(err => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#070D1F] text-slate-100 p-4 overflow-y-auto space-y-4 select-none">
      <div className="flex items-center justify-between border-b border-[#1E2E56] pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <FileCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold uppercase font-['Chakra_Petch'] text-white">
              RTO & Compliance Governance
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Vehicle Fitness • National Permit • Commercial Insurance • PUC • State Road Tax • Green Tax
            </p>
          </div>
        </div>

        <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
          1 Actionable Compliance Renewal Due
        </span>
      </div>

      {/* Compliance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {records.map(rec => {
          const isExpiring = rec.status === 'EXPIRING_SOON';
          return (
            <div key={rec.id} className={`p-4 rounded-xl border ${
              isExpiring ? 'bg-[#151D36] border-rose-600/60 shadow-lg shadow-rose-950/30' : 'bg-[#0B152E] border-slate-800'
            } space-y-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-bold text-white font-mono">{rec.reg_no}</span>
                  <span className="ml-2 text-xs text-slate-400">({rec.vehicle_id})</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  isExpiring ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {isExpiring ? 'EXPIRING WITHIN 7 DAYS' : 'COMPLIANT & VALID'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-[#070D1F] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Fitness Expiry</span>
                  <span className={`font-bold ${isExpiring ? 'text-rose-400' : 'text-slate-200'}`}>{formatDateDDMMYYYY(rec.fitness_expiry)}</span>
                </div>
                <div className="p-2 rounded bg-[#070D1F] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">National Permit</span>
                  <span className={`font-bold ${isExpiring ? 'text-rose-400' : 'text-slate-200'}`}>{formatDateDDMMYYYY(rec.national_permit_expiry)}</span>
                </div>
                <div className="p-2 rounded bg-[#070D1F] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Commercial Ins.</span>
                  <span className="font-bold text-slate-200">{formatDateDDMMYYYY(rec.insurance_expiry)}</span>
                </div>
                <div className="p-2 rounded bg-[#070D1F] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">PUC Emission</span>
                  <span className="font-bold text-slate-200">{formatDateDDMMYYYY(rec.puc_expiry)}</span>
                </div>
                <div className="p-2 rounded bg-[#070D1F] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Road Tax</span>
                  <span className="font-bold text-slate-200">{formatDateDDMMYYYY(rec.road_tax_expiry)}</span>
                </div>
                <div className="p-2 rounded bg-[#070D1F] border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Green Cess Tax</span>
                  <span className="font-bold text-slate-200">{formatDateDDMMYYYY(rec.green_tax_expiry)}</span>
                </div>
              </div>

              {isExpiring && (
                <div className="pt-2 border-t border-rose-900/60 flex items-center justify-between text-xs">
                  <span className="text-rose-300 font-mono">Urgent: Vahan 4.0 portal fee payment pending</span>
                  <button className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[11px] transition">
                    Upload RTO Renewal Slip
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
