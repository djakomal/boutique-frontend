import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
} from 'recharts';
import type { DashboardStats, AgentDashboardStats } from '../types';

const fmt  = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';
const fmtK = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : String(n);

/* ── Tooltips ── */
interface TProps { active?: boolean; payload?: { value: number }[]; label?: string; }
const TipRevenue = ({ active, payload, label }: TProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 14px', boxShadow: '0 4px 16px rgba(22,163,74,0.15)' }}>
      <p style={{ color: '#16a34a', fontSize: 11, marginBottom: 3, fontWeight: 500 }}>{label}</p>
      <p style={{ fontWeight: 700, color: '#14532d', fontSize: 14 }}>{fmt(payload[0].value)}</p>
    </div>
  );
};
const TipCount = ({ active, payload, label }: TProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 14px', boxShadow: '0 4px 16px rgba(22,163,74,0.15)' }}>
      <p style={{ color: '#16a34a', fontSize: 11, marginBottom: 3, fontWeight: 500 }}>{label}</p>
      <p style={{ fontWeight: 700, color: '#14532d', fontSize: 14 }}>{payload[0].value} vente(s)</p>
    </div>
  );
};

/* ── SVG Icons ── */
const IcoTrend = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IcoUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoAlert = ({ color = '#ca8a04' }: { color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IcoCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IcoPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IcoBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);
const IcoActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IcoArrow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7"/>
    <polyline points="7 7 17 7 17 17"/>
  </svg>
);
const IcoEmptyChart = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#bbf7d0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);
const IcoEmptyBox = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#bbf7d0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

/* ── StatCard ── */
function StatCard({ icon, label, value, sub, bg, iconColor, border }: {
  icon: React.ReactNode; label: string; value: string;
  bg: string; iconColor: string; border: string; sub?: string;
}) {
  return (
    <div
      style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 14, padding: 20, transition: 'all 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(22,163,74,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.transform = ''; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        {icon}
      </div>
      <p style={{ fontSize: 12, color: '#16a34a', marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#14532d', lineHeight: 1.2 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

/* ── Dashboard ── */
export default function DashboardPage() {
  const { isAdmin, user } = useAuth();
  const [stats,      setStats]      = useState<DashboardStats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentDashboardStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        if (isAdmin) {
          const r = await dashboardAPI.getStats();
          const b = r.data as Record<string, unknown>;
          setStats((b.data ?? b) as DashboardStats);
        } else {
          const r = await dashboardAPI.getAgentStats();
          const b = r.data as Record<string, unknown>;
          setAgentStats((b.data ?? b) as AgentDashboardStats);
        }
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || err.message || 'Erreur de connexion au serveur');
      } finally { setLoading(false); }
    })();
  }, [isAdmin]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 44, height: 44, border: '3px solid #dcfce7', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <IcoAlert color="#ef4444" />
        </div>
        <p style={{ fontWeight: 700, color: '#14532d', fontSize: 16, marginBottom: 8 }}>Impossible de charger le tableau de bord</p>
        <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 14 }}>{error}</p>
        <div style={{ padding: '10px 18px', borderRadius: 10, background: '#f0fdf4', color: '#166534', fontSize: 12, display: 'inline-block' }}>
          💡 Démarrez le backend : <code style={{ fontWeight: 600 }}>node server.js</code>
        </div>
      </div>
    </div>
  );

  /* ══════════ VUE AGENT ══════════ */
  if (!isAdmin && agentStats) {
    const days   = agentStats.revenue_by_day ?? [];
    const hasRev = days.some(d => d.revenue > 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#14532d', marginBottom: 4 }}>Bonjour, {user?.name?.split(' ')[0]} 👋</h1>
            <p style={{ fontSize: 13, color: '#16a34a' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, background: '#dcfce7', border: '1px solid #bbf7d0' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>En service</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          <StatCard icon={<IcoCart/>}    label="Ventes aujourd'hui"     value={String(agentStats.sales_today)}   bg="#ccfbf1" iconColor="#0d9488" border="#99f6e4" sub="transactions" />
          <StatCard icon={<IcoTrend/>}   label="Total revenus"          value={fmt(agentStats.total_revenue)}    bg="#d1fae5" iconColor="#059669" border="#6ee7b7" sub={`${agentStats.total_sales} ventes`} />
          <StatCard icon={<IcoPackage/>} label="Produits disponibles"   value={String(agentStats.total_products)} bg="#ecfccb" iconColor="#65a30d" border="#d9f99d" sub="références actives" />
        </div>

        <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: 14 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#14532d', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IcoActivity />Mes revenus — 7 derniers jours
            </h2>
            <p style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>Total : {fmt(days.reduce((s, d) => s + d.revenue, 0))}</p>
          </div>
          {hasRev ? (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAgent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#16a34a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#16a34a' }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={50} />
                  <Tooltip content={<TipRevenue />} />
                  <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} fill="url(#gradAgent)" dot={{ fill: '#16a34a', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#15803d', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <IcoEmptyChart />
              <p style={{ fontSize: 14, color: '#86efac' }}>Aucune vente enregistrée cette semaine</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════ VUE ADMIN ══════════ */
  if (isAdmin && stats) {
    const days    = stats.revenue_by_day ?? [];
    const hasData = days.length > 0;
    const weekRev = days.reduce((s, d) => s + d.revenue, 0);
    const bestDay = hasData ? days.reduce((b, d) => d.revenue > b.revenue ? d : b, days[0]) : null;
    const hasSales = days.some(d => d.sales > 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#14532d', marginBottom: 4 }}>Tableau de bord</h1>
            <p style={{ fontSize: 13, color: '#16a34a' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, background: '#dcfce7', border: '1px solid #bbf7d0' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>Système actif</span>
          </div>
        </div>

        {/* 3 KPI — exactement comme le screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={<IcoTrend/>}                                             label="Revenus totaux"    value={fmt(stats.total_revenue)}      bg="#dcfce7" iconColor="#16a34a" border="#bbf7d0" sub={`${stats.total_sales} ventes`} />
          <StatCard icon={<IcoUsers/>}                                             label="Agents actifs"     value={String(stats.agents_count)}    bg="#dcfce7" iconColor="#16a34a" border="#bbf7d0" sub="vendeurs" />
          <StatCard icon={<IcoAlert color={stats.low_stock_count > 0 ? '#ca8a04' : '#16a34a'} />}
                    label="Stocks critiques"
                    value={String(stats.low_stock_count)}
                    bg={stats.low_stock_count > 0 ? '#fef9c3' : '#dcfce7'}
                    iconColor={stats.low_stock_count > 0 ? '#ca8a04' : '#16a34a'}
                    border={stats.low_stock_count > 0 ? '#fde68a' : '#bbf7d0'}
                    sub={`sur ${stats.total_products} produits`} />
        </div>

        {/* Alerte */}
        {stats.low_stock_count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13 }}>
            <IcoAlert color="#ef4444" />
            <span style={{ color: '#c0392b', fontWeight: 500 }}>{stats.low_stock_count} produit(s) en stock critique — réapprovisionnement requis !</span>
          </div>
        )}

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">

          {/* BarChart revenus */}
          <div className="p-4 sm:p-6 min-w-0" style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: '#14532d', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IcoBarChart />Évolution des revenus
                </h2>
                <p style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>7 derniers jours — {fmt(weekRev)}</p>
              </div>
              {hasData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 10px', borderRadius: 8, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                  <IcoArrow />&nbsp;{days[days.length - 1]?.sales || 0} ventes hier
                </div>
              )}
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#16a34a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#16a34a' }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={50} />
                  <Tooltip content={<TipRevenue />} cursor={{ fill: '#f0fdf4' }} />
                  <Bar dataKey="revenue" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top produits */}
          <div className="p-4 sm:p-6 min-w-0" style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#14532d', marginBottom: 4 }}>Top produits</h2>
            <p style={{ fontSize: 12, color: '#16a34a', marginBottom: 20 }}>Par chiffre d'affaires</p>
            {stats.top_products?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {stats.top_products.map((p, i) => {
                  const max    = stats.top_products[0].revenue;
                  const pct    = max > 0 ? Math.round((p.revenue / max) * 100) : 0;
                  const shades = ['#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac'];
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', color: '#166634', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontWeight: 500, color: '#14532d', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#16a34a' }}>{p.quantity} u.</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: '#dcfce7', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: shades[i] || shades[4], width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                      <p style={{ textAlign: 'right', fontSize: 10, color: '#16a34a', marginTop: 3 }}>{fmt(p.revenue)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10 }}>
                <IcoEmptyBox />
                <p style={{ fontSize: 14, color: '#86efac' }}>Aucune vente</p>
              </div>
            )}
          </div>
        </div>

        {/* Volume transactions */}
        {hasData && hasSales && (
          <div className="p-4 sm:p-6" style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: 14 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#14532d', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IcoActivity />Volume de transactions — 7 jours
              </h2>
              <p style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>Total : {days.reduce((s, d) => s + d.sales, 0)} ventes</p>
            </div>
            <div style={{ width: '100%', height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={days} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#16a34a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#16a34a' }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                  <Tooltip content={<TipCount />} />
                  <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#16a34a', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#15803d', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Résumé bas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16 }}>
          {[
            { label: 'Revenus 7j',    value: fmt(weekRev),                                                                                                                    sub: 'Cette semaine' },
            { label: 'Panier moyen',  value: stats.total_sales > 0 ? fmt(Math.round(stats.total_revenue / stats.total_sales)) : '—',                                          sub: 'Par vente'     },
            { label: 'Meilleur jour', value: bestDay?.date || '—',                                                                                                             sub: bestDay ? fmt(bestDay.revenue) : '—' },
            { label: 'Taux stock OK', value: stats.total_products > 0 ? `${Math.round(((stats.total_products - stats.low_stock_count) / stats.total_products) * 100)}%` : '—', sub: `${stats.total_products - stats.low_stock_count}/${stats.total_products} produits` },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', border: '1px solid #dcfce7', borderRadius: 14, padding: 18 }}>
              <p style={{ fontSize: 12, color: '#16a34a', marginBottom: 10 }}>{item.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#14532d', lineHeight: 1.2 }}>{item.value}</p>
              <p style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>{item.sub}</p>
            </div>
          ))}
        </div>

      </div>
    );
  }

  return null;
}
