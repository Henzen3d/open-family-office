'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Activity,
  DollarSign,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

export interface ChartPoint {
  timestamp: number;
  datetime: string;
  price: number;
}

export interface ChartData {
  symbol: string;
  name: string;
  currency: string;
  timeframe: string;
  current_price: number;
  previous_close: number;
  change: number;
  pct_change: number;
  points: ChartPoint[];
  stats: {
    open: number;
    prev_close: number;
    day_low: number;
    day_high: number;
    var_1d: number;
    var_1m: number;
    var_ytd: number;
    var_1y: number;
  };
}

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetSymbol: string;
}

const TIMEFRAMES = [
  { id: '1d', label: '1d' },
  { id: '5d', label: '5d' },
  { id: '1m', label: '1m' },
  { id: '6m', label: '6m' },
  { id: '1a', label: '1a' },
  { id: '5a', label: '5a' },
];

export default function AssetDetailModal({
  isOpen,
  onClose,
  assetSymbol,
}: AssetDetailModalProps) {
  const [timeframe, setTimeframe] = useState<'1d' | '5d' | '1m' | '6m' | '1a' | '5a'>('1d');
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const fetchChart = async (sym: string, tf: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/py/market/chart?symbol=${encodeURIComponent(sym)}&timeframe=${tf}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assetSymbol) {
      fetchChart(assetSymbol, timeframe);
      setHoveredPoint(null);
      setHoverPosition(null);
    }
  }, [isOpen, assetSymbol, timeframe]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isPositive = (data?.pct_change ?? 0) >= 0;
  const strokeColor = isPositive ? '#10B981' : '#F43F5E';
  const fillColor = isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)';

  // Calculate SVG Points & Scaled Coordinates
  const chartCoordinates = useMemo(() => {
    if (!data || !data.points || data.points.length === 0) return null;

    const points = data.points;
    const prices = points.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const isFlat = maxPrice === minPrice;
    const range = isFlat ? 1 : maxPrice - minPrice;

    const width = 800;
    const height = 260;
    const padding = 20;

    const coords = points.map((p, idx) => {
      const divisor = Math.max(points.length - 1, 1);
      const x = padding + (idx / divisor) * (width - padding * 2);
      const y = isFlat
        ? height / 2
        : height - padding - ((p.price - minPrice) / range) * (height - padding * 2);
      return { x, y, point: p };
    });

    // Build SVG path string with smooth curves
    const pathD = coords.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');

    // Area polygon
    const first = coords[0];
    const last = coords[coords.length - 1];
    const areaD = `${pathD} L ${last.x} ${height} L ${first.x} ${height} Z`;

    // Baseline Y (previous close)
    let baselineY: number | null = null;
    if (data.previous_close >= minPrice && data.previous_close <= maxPrice) {
      baselineY = height - padding - ((data.previous_close - minPrice) / range) * (height - padding * 2);
    }

    return { coords, pathD, areaD, baselineY, width, height, minPrice, maxPrice };
  }, [data]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartCoordinates || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * chartCoordinates.width;

    // Find closest point by X coordinate
    let closest = chartCoordinates.coords[0];
    let minDiff = Infinity;
    for (const c of chartCoordinates.coords) {
      const diff = Math.abs(c.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }

    setHoveredPoint(closest.point);
    setHoverPosition({ x: closest.x, y: closest.y });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverPosition(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[720px] max-h-[92vh] flex flex-col bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#1a202c]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xs">
              {data?.symbol?.replace('^', '') || assetSymbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {data?.name || assetSymbol}
                </h2>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                  {data?.currency || 'BRL'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Cotação em tempo real e evolução histórica com base no Banco Central e Yahoo Finance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Price & Change Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cotação Atual</span>
              <div className="flex items-baseline gap-3 mt-0.5">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">
                  {data?.current_price !== undefined
                    ? data.current_price >= 1000
                      ? data.current_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : `${data.currency === 'BRL' ? 'R$ ' : data.currency === '%' ? '' : '$'}${data.current_price.toFixed(2)}${data.currency === '%' ? '%' : ''}`
                    : '---'}
                </span>

                {data && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                      isPositive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30'
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{data.change >= 0 ? `+${data.change.toFixed(2)}` : data.change.toFixed(2)}</span>
                    <span>({data.pct_change >= 0 ? `+${data.pct_change.toFixed(2)}%` : `${data.pct_change.toFixed(2)}%`})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Timeframe Selector Pills */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#161c28] p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    timeframe === tf.id
                      ? 'bg-indigo-600 text-white shadow-pill'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Display Area */}
          <div className="relative p-5 rounded-3xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Evolução no período ({timeframe.toUpperCase()})
              </span>
              {hoveredPoint && (
                <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-fadeIn">
                  {hoveredPoint.datetime}: {hoveredPoint.price.toLocaleString('pt-BR')}
                </div>
              )}
            </div>

            {loading ? (
              <div className="w-full h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs font-medium">Carregando série histórica de preços...</span>
              </div>
            ) : chartCoordinates ? (
              <div className="relative w-full h-64 select-none">
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${chartCoordinates.width} ${chartCoordinates.height}`}
                  className="w-full h-full cursor-crosshair overflow-visible"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity="0.30" />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Baseline (Previous Close) */}
                  {chartCoordinates.baselineY !== null && (
                    <line
                      x1="0"
                      y1={chartCoordinates.baselineY}
                      x2={chartCoordinates.width}
                      y2={chartCoordinates.baselineY}
                      stroke="#94A3B8"
                      strokeDasharray="4 4"
                      strokeOpacity="0.4"
                      strokeWidth="1"
                    />
                  )}

                  {/* Gradient Area Fill */}
                  <path d={chartCoordinates.areaD} fill="url(#chartGradient)" />

                  {/* Trend Line Curve */}
                  <path
                    d={chartCoordinates.pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Hovered Scrubber Line and Circle */}
                  {hoverPosition && (
                    <g>
                      <line
                        x1={hoverPosition.x}
                        y1="0"
                        x2={hoverPosition.x}
                        y2={chartCoordinates.height}
                        stroke="#6366F1"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={hoverPosition.x}
                        cy={hoverPosition.y}
                        r="5"
                        fill="#6366F1"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="animate-ping-once"
                      />
                    </g>
                  )}
                </svg>

                {/* Min and Max Reference Labels */}
                <div className="absolute right-2 top-2 text-[10px] font-mono font-semibold text-slate-400">
                  Máx: {chartCoordinates.maxPrice.toLocaleString('pt-BR')}
                </div>
                <div className="absolute right-2 bottom-2 text-[10px] font-mono font-semibold text-slate-400">
                  Mín: {chartCoordinates.minPrice.toLocaleString('pt-BR')}
                </div>
              </div>
            ) : (
              <div className="w-full h-64 flex items-center justify-center text-xs text-slate-400">
                Sem dados históricos disponíveis para este ativo no momento.
              </div>
            )}
          </div>

          {/* InfoMoney-Style Summary Statistics Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Métricas & Estatísticas de Mercado
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Abertura</span>
                <p className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {data?.stats?.open?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '---'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Fech. Anterior</span>
                <p className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {data?.stats?.prev_close?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '---'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Mín - Máx (Período)</span>
                <p className="text-xs font-bold font-mono text-slate-900 dark:text-white mt-1">
                  {data?.stats?.day_low ? `${data.stats.day_low.toFixed(0)} - ${data.stats.day_high.toFixed(0)}` : '---'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Variação 1D</span>
                <p
                  className={`text-xs font-bold font-mono mt-1 ${
                    (data?.stats?.var_1d ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {(data?.stats?.var_1d ?? 0) >= 0 ? `+${data?.stats?.var_1d}%` : `${data?.stats?.var_1d}%`}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Variação YTD</span>
                <p
                  className={`text-xs font-bold font-mono mt-1 ${
                    (data?.stats?.var_ytd ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {(data?.stats?.var_ytd ?? 0) >= 0 ? `+${data?.stats?.var_ytd}%` : `${data?.stats?.var_ytd}%`}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121722] border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Variação 1 Ano</span>
                <p
                  className={`text-xs font-bold font-mono mt-1 ${
                    (data?.stats?.var_1y ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {(data?.stats?.var_1y ?? 0) >= 0 ? `+${data?.stats?.var_1y}%` : `${data?.stats?.var_1y}%`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

