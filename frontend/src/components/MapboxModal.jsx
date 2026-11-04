import React, { useState } from 'react';
import { X, Check, Key, ExternalLink, Globe, Layers, AlertCircle } from 'lucide-react';
import { getStoredMapboxToken, setStoredMapboxToken } from '../services/mapProviders';

export default function MapboxModal({ isOpen, onClose, onTokenUpdated, currentProvider, setMapProvider }) {
  const [tokenInput, setTokenInput] = useState(getStoredMapboxToken());
  const [selectedStyle, setSelectedStyle] = useState('mapbox_nav');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const hasActiveToken = Boolean(tokenInput && tokenInput.trim().startsWith('pk.'));

  const handleSave = () => {
    const trimmed = (tokenInput || '').trim();
    if (trimmed && !trimmed.startsWith('pk.')) {
      setErrorMsg('Please enter a valid MapBox Public Access Token starting with "pk."');
      return;
    }

    setStoredMapboxToken(trimmed);
    setErrorMsg('');
    setSavedSuccess(true);

    if (trimmed) {
      setMapProvider(selectedStyle);
    } else {
      setMapProvider('dark');
    }

    if (onTokenUpdated) onTokenUpdated(trimmed);

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setTokenInput('');
    setStoredMapboxToken('');
    setErrorMsg('');
    setMapProvider('dark');
    if (onTokenUpdated) onTokenUpdated('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#070F26] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#091536] border-b border-[#1E2E56] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
              <Globe size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-[15px] font-['Chakra_Petch'] tracking-wide">
                  MapBox API Integration
                </h3>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  hasActiveToken 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60' 
                    : 'bg-amber-950 text-amber-300 border border-amber-500/60'
                }`}>
                  {hasActiveToken ? 'Connected' : 'Token Required'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official MapBox vector & satellite tile engine for telematics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0C1B42] hover:bg-[#152B66] text-slate-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Info Banner */}
          <div className="p-3 rounded-xl bg-[#091838] border border-cyan-900/60 text-xs text-slate-300 leading-relaxed flex items-start space-x-2.5">
            <Layers size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <div>
              Enter your MapBox Public Access Token (<code className="text-cyan-300 font-mono">pk.eyJ...</code>) to stream MapBox's specialized fleet styles (Navigation Night, Dark Tactical, and High-Res Satellite).
            </div>
          </div>

          {/* Token Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key size={13} className="text-cyan-400" />
                MapBox Public Access Token
              </span>
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 text-[10.5px] lowercase flex items-center gap-1 hover:underline"
              >
                get free token <ExternalLink size={10} />
              </a>
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setErrorMsg('');
              }}
              placeholder="pk.eyJ1IjoieW91ci1hY2NvdW50IiwiYSI6ImNsd3..."
              className="w-full px-3 py-2.5 rounded-xl bg-[#050C1F] border border-[#1E2E56] focus:border-cyan-400 focus:outline-none text-cyan-200 text-xs font-mono placeholder:text-slate-600 transition"
            />
            {errorMsg && (
              <div className="text-[11px] text-rose-400 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle size={13} />
                {errorMsg}
              </div>
            )}
          </div>

          {/* MapBox Style Preset Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Select MapBox Style Layer
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'mapbox_nav', label: 'Navigation Night', desc: 'Fleet Dispatch Optimized (Dark)' },
                { id: 'mapbox_dark', label: 'Dark Tactical v11', desc: 'Minimalist Vector Cartography' },
                { id: 'mapbox_satellite', label: 'Satellite Streets', desc: 'Photorealistic Aerial + Roads' },
                { id: 'mapbox_streets', label: 'Streets v12', desc: 'Global Highways & Corridors' }
              ].map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    selectedStyle === style.id
                      ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'bg-[#091533] border-[#1A2A54] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{style.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Status feedback */}
          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2">
              <Check size={15} className="text-emerald-400" />
              <span>MapBox API linked successfully! Refreshing active map tiles...</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#091536] border-t border-[#1E2E56] flex items-center justify-between">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
          >
            Reset to Pro Dark Base
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#0D1E47] hover:bg-[#152B66] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition flex items-center gap-1.5"
            >
              <Check size={14} />
              Save & Link MapBox
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
