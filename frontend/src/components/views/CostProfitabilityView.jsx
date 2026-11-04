import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Fuel, Award, ArrowUpRight } from 'lucide-react';
import { fetchCostProfitability } from '../../services/api';

export default function CostProfitabilityView() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    fetchCostProfitability().then(data => setMetrics(data)).catch(err => console.error(err));
  }, []);

  const totalRevenue = metrics.reduce((acc, m) => acc + m.revenue, 0);
  const totalFuelCost = metrics.reduce((acc, m) => acc + m.fuelCost, 0);
  const totalNetProfit = metrics.reduce((acc, m) => acc + m.netProfit, 0);
  const avgMargin = totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="h-full flex flex-col bg-[#070D1F] text-slate-100 p-4 overflow-y-auto space-y-4 select-none">
      <div className="flex items-center justify-between border-b border-[#1E2E56] pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold uppercase font-['Chakra_Petch'] text-white">
              Trip Cost & Freight Profitability Analysis
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Diesel Expense vs Toll & Billing • Revenue Per Ton-Km • Operational Operating Margin
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-emerald-400 font-bold">
          Operating Margin: {avgMargin}%
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-3 rounded-xl bg-[#0B152E] border border-slate-700">
          <span className="text-[10px] text-slate-400 uppercase block">Gross Billing Revenue</span>
          <span className="text-xl font-bold text-white">₹{totalRevenue.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 rounded-xl bg-[#0B152E] border border-amber-900/60">
          <span className="text-[10px] text-amber-400 uppercase block">Diesel Fuel Burn Cost</span>
          <span className="text-xl font-bold text-amber-300">₹{totalFuelCost.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 rounded-xl bg-[#0B152E] border border-emerald-900/60">
          <span className="text-[10px] text-emerald-400 uppercase block">Net Freight Margin</span>
          <span className="text-xl font-bold text-emerald-400">₹{totalNetProfit.toLocaleString('en-IN')}</span>
        </div>
        <div className="p-3 rounded-xl bg-[#0B152E] border border-cyan-900/60">
          <span className="text-[10px] text-cyan-400 uppercase block">Avg Operating Margin</span>
          <span className="text-xl font-bold text-cyan-300">{avgMargin}%</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0B152E] border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 gap-2 px-3 py-2 bg-[#080E24] text-[10px] font-mono uppercase font-bold text-slate-400 border-b border-slate-800">
          <div>Vehicle Reg No</div>
          <div>Vehicle Model</div>
          <div className="text-right">Distance (km)</div>
          <div className="text-right">Diesel Cost</div>
          <div className="text-right">Toll & Misc</div>
          <div className="text-right">Gross Revenue</div>
          <div className="text-right">Net Margin</div>
        </div>

        <div className="divide-y divide-slate-800/80 text-xs font-mono">
          {metrics.map(m => (
            <div key={m.id} className="grid grid-cols-7 gap-2 px-3 py-2.5 hover:bg-[#0E1B3D] transition items-center">
              <div className="font-bold text-cyan-300">{m.reg_no}</div>
              <div className="text-slate-300 truncate">{m.model || 'Commercial Carrier'}</div>
              <div className="text-right text-slate-200">{m.kms} km</div>
              <div className="text-right text-amber-400">₹{m.fuelCost.toLocaleString()}</div>
              <div className="text-right text-slate-400">₹{m.tollCost.toLocaleString()}</div>
              <div className="text-right text-white font-bold">₹{m.revenue.toLocaleString()}</div>
              <div className="text-right text-emerald-400 font-bold">₹{m.netProfit.toLocaleString()} ({m.profitMarginPercent}%)</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
