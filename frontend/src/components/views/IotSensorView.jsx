import React from 'react';
import { Cpu, Wifi, Radio, Activity, CheckCircle2, ShieldCheck, Database } from 'lucide-react';

export default function IotSensorView() {
  const sensors = [
    { name: 'Axona Dual-Capacitive Fuel Rod (Level + Water Float)', protocol: 'RS485 Modbus', latency: '40ms', status: 'ONLINE', accuracy: '±0.5% FS' },
    { name: 'J1939 CANBus / OBD-II Engine Telemetry Gateway', protocol: 'ISO 15765 CAN', latency: '25ms', status: 'ONLINE', accuracy: 'RPM, Torque, CPH' },
    { name: 'BLE 5.2 Reefer Multi-Point Temperature Beacons', protocol: 'Bluetooth Low Energy', latency: '120ms', status: 'ONLINE', accuracy: '±0.1°C' },
    { name: 'Axle Strain Gauge Weigh-In-Motion Transducers', protocol: 'Analog 4-20mA to ADC', latency: '50ms', status: 'ONLINE', accuracy: '±1.5% GVW' },
    { name: '4G LTE-M / GPS NavIC Satellite Position Tracker', protocol: 'MQTT / TLS 1.3', latency: '85ms', status: 'ONLINE', accuracy: '< 2.5m CEP' },
    { name: 'Fuel Filler Neck Anti-Siphoning Mesh & Magnetic Sensor', protocol: 'Digital Dry Contact', latency: '10ms', status: 'ONLINE', accuracy: 'Instant Tamper' }
  ];

  return (
    <div className="h-full flex flex-col bg-[#070D1F] text-slate-100 p-4 overflow-y-auto space-y-4 select-none">
      <div className="flex items-center justify-between border-b border-[#1E2E56] pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold uppercase font-['Chakra_Petch'] text-white">
              Integrations & IoT Sensor Gateway
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Hardware Diagnostics • Modbus Telemetry • CANBus J1939 • Real-time MQTT Broker
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gateway Connected (100% Health)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
        {sensors.map((s, i) => (
          <div key={i} className="p-3.5 rounded-xl bg-[#0B152E] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">{s.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                {s.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <div>Protocol: <span className="text-cyan-300 font-bold">{s.protocol}</span></div>
              <div>Latency: <span className="text-emerald-400 font-bold">{s.latency}</span></div>
              <div>Accuracy: <span className="text-slate-200">{s.accuracy}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
