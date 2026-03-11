import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { useAppToast } from '../components/Layout';
import {
  Save, Lock, User, CheckCircle, AlertTriangle,
  ShieldCheck, Eye, EyeOff, Mail, Phone, Crown, UserCircle,
} from 'lucide-react';

export default function SettingsPage() {
  const { user }  = useAuth();
  const toast     = useAppToast();
  const [tab, setTab] = useState<'profile' | 'security'>('profile');

  const [pwForm, setPwForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving]       = useState(false);
  const [pwError, setPwError]         = useState('');
  const [pwSuccess, setPwSuccess]     = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Les mots de passe ne correspondent pas'); return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Le mot de passe doit avoir au moins 6 caractères'); return;
    }
    setPwSaving(true); setPwError(''); setPwSuccess(false);
    try {
      await authAPI.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Mot de passe modifié', 'Votre nouveau mot de passe est actif');
      setTimeout(() => setPwSuccess(false), 5000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Erreur lors du changement de mot de passe';
      setPwError(msg);
      toast.error('Erreur', msg);
    } finally { setPwSaving(false); }
  };

  // Calcul force du mot de passe
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6)  score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { score, label: 'Très faible', color: 'bg-rose-400' };
    if (score <= 2) return { score, label: 'Faible',      color: 'bg-orange-400' };
    if (score <= 3) return { score, label: 'Moyen',       color: 'bg-amber-400' };
    if (score <= 4) return { score, label: 'Fort',        color: 'bg-emerald-400' };
    return                  { score, label: 'Très fort',  color: 'bg-emerald-600' };
  };

  const pwStrength = getPasswordStrength(pwForm.newPassword);
  const initiale   = user?.name?.charAt(0).toUpperCase() || '?';

  return (
    <div className="space-y-5 max-w-2xl animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gérez votre compte et vos préférences</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: 'profile',  label: 'Profil',   icon: User  },
          { key: 'security', label: 'Sécurité', icon: Lock  },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key
                ? 'border-slate-700 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Onglet Profil */}
      {tab === 'profile' && (
        <div className="space-y-4">
          {/* Carte profil */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 relative">
                {initiale}
                {user?.role === 'admin' && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{user?.name}</h3>
                <p className="text-slate-500 text-sm">{user?.email}</p>
                <span className={`badge mt-1.5 inline-block ${
                  user?.role === 'admin'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {user?.role === 'admin' ? 'Administrateur' : 'Agent vendeur'}
                </span>
              </div>
            </div>
          </div>

          {/* Informations compte */}
          <div className="card p-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-slate-400" />
              Informations du compte
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Nom complet',      value: user?.name || '—',                                  icon: User  },
                { label: 'Adresse email',    value: user?.email || '—',                                 icon: Mail  },
                { label: 'Téléphone',        value: (user as { phone?: string })?.phone || 'Non renseigné', icon: Phone },
                { label: 'Rôle',             value: user?.role === 'admin' ? 'Administrateur' : 'Agent', icon: Crown },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className="w-3 h-3 text-slate-400" />
                    <p className="text-xs text-slate-400">{item.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          
          {/* Sécurité rapide */}
          <div className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Compte sécurisé</p>
                <p className="text-xs text-slate-500">
                  Mot de passe chiffré avec bcrypt · Authentification JWT 7 jours
                </p>
              </div>
              <div className="sm:ml-auto">
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100">
                  ● Actif
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Sécurité */}
      {tab === 'security' && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Changer le mot de passe</h3>
              <p className="text-slate-500 text-xs">Utilisez un mot de passe fort d'au moins 6 caractères</p>
            </div>
          </div>

          {pwError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Mot de passe modifié avec succès !
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Mot de passe actuel</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="input pr-10"
                  placeholder="Min. 6 caractères"
                  required
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Jauge force mot de passe */}
              {pwForm.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          i <= pwStrength.score ? pwStrength.color : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Force : <span className="font-medium">{pwStrength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="label">Confirmer le mot de passe</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className={`input pr-10 ${
                    pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword
                      ? 'border-rose-300 focus:border-rose-400'
                      : ''
                  }`}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <p className="text-xs text-rose-600 mt-1">⚠ Les mots de passe ne correspondent pas</p>
              )}
              {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && (
                <p className="text-xs text-emerald-600 mt-1">✓ Les mots de passe correspondent</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                className="btn-primary disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {pwSaving ? 'Modification…' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>

                  </div>
      )}
    </div>
  );
}
