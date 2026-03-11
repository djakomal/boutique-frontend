import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, Eye, EyeOff, AlertCircle, ShieldCheck, Package, BarChart2, Users } from 'lucide-react';


const FEATURES = [
  { icon: Package,   label: 'Gestion des stocks en temps réel', desc: 'Alertes automatiques'  },
  { icon: BarChart2, label: 'Tableaux de bord & statistiques',  desc: 'Revenus, top produits' },
  { icon: Users,     label: 'Multi-agents avec rôles',          desc: 'Admin & vendeurs'      },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) setError(result.message || 'Email ou mot de passe incorrect');
  };

  
  return (
    <div className="min-h-screen flex">
      {/* ── Panneau gauche ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] p-12 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #14532d 0%, #166534 40%, #15803d 100%)' }}
      >
        {/* Décoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[400, 300, 200, 120].map((size, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                bottom: -size / 3,
                right: -size / 4,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            />
          ))}
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{ background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 50%, transparent 100%)' }}
          />
          {/* Motif feuilles */}
          <div
            className="absolute top-20 right-10 w-32 h-32 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }}
          />
          <div
            className="absolute bottom-32 left-8 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #86efac, transparent)' }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Boutique</span>
          </div>

          <div className="space-y-5">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#86efac' }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
              Système de gestion de boutique
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white">
              Gérez votre<br />boutique avec<br />
              <span style={{ color: '#4ade80' }}>efficacité</span>
            </h1>
            <p className="text-base leading-relaxed max-w-xs" style={{ color: '#bbf7d0' }}>
              Inventaire, ventes et agents — tout centralisé dans une interface professionnelle dédiée au commerce alimentaire.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-3">
          {FEATURES.map(f => (
            <div
              key={f.label}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(74, 222, 128, 0.2)' }}
              >
                <f.icon className="w-4 h-4" style={{ color: '#4ade80' }} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{f.label}</p>
                <p className="text-xs" style={{ color: '#86efac' }}>{f.desc}</p>
              </div>
            </div>
          ))}
          <div className="pt-4 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: '#4ade80' }}>
            © 2025 Boutique · Gestion de  boutique professionnelle
          </div>
        </div>
      </div>

      {/* ── Panneau droit — Formulaire ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8" style={{ background: '#f8fafc' }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
              style={{ background: '#16a34a' }}
            >
              <Store className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#1e293b' }}>Boutique</h1>
            <p className="text-sm" style={{ color: '#64748b' }}>Gestion Boutique</p>
          </div>

          {/* Titre */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold" style={{ color: '#1e293b' }}>Connexion</h2>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
              Entrez vos identifiants pour accéder à votre espace
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
              style={{ background: '#fff5f5', border: '1px solid #fecaca', color: '#c0392b' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
                className="input"
              />
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition p-1"
                  style={{ color: '#16a34a' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 text-white"
              style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Connexion en cours…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Se connecter
                </>
              )}
            </button>
          </form>

                  </div>
      </div>
    </div>
  );
}
