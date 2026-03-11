import { useEffect, useState } from 'react';
import { agentsAPI, extractList } from '../services/api';
import { User, Sale } from '../types';
import {
  Trash2, Eye, X, UserPlus, Phone, Mail,
  TrendingUp, ShoppingCart, ToggleLeft, ToggleRight,
  AlertTriangle, RefreshCw, Calendar,
} from 'lucide-react';
import { useAppToast } from '../components/Layout';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n) || 0) + ' FCFA';

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); }
  catch { return '—'; }
};

const fmtDateTime = (d?: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const PAY_LABELS: Record<string, string> = {
  cash:         'Espèces',
  mobile_money: 'Mobile Money',
  credit:       'Crédit',
};
const PAY_COLORS: Record<string, string> = {
  cash:         'bg-slate-100 text-slate-600',
  mobile_money: 'bg-sky-50 text-sky-700',
  credit:       'bg-orange-50 text-orange-700',
};
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Complétée', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Annulée',   cls: 'bg-rose-50 text-rose-700'       },
  pending:   { label: 'En attente', cls: 'bg-amber-50 text-amber-700'    },
};

export default function AgentsPage() {
  const toast = useAppToast();
  const [agents, setAgents]       = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError]   = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ name: '', email: '', password: '', phone: '' });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  // Modal ventes agent
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [agentSales, setAgentSales]       = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading]   = useState(false);
  const [salesSearch, setSalesSearch]     = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setApiError('');
    try {
      const r = await agentsAPI.getAll();
      setAgents(extractList<User>(r));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setApiError(err.response?.data?.message || err.message || 'Erreur de connexion');
      setAgents([]);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) {
      setFormError('Nom, email et mot de passe sont obligatoires'); return;
    }
    if (form.password.length < 6) {
      setFormError('Le mot de passe doit comporter au moins 6 caractères'); return;
    }
    setSaving(true); setFormError('');
    try {
      await agentsAPI.create(form);
      toast.success('Agent créé', `${form.name} peut maintenant se connecter`);
      setShowAdd(false);
      setForm({ name: '', email: '', password: '', phone: '' });
      await load(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setFormError(err.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Supprimer définitivement "${name}" ? Ses ventes seront conservées.`)) return;
    try {
      await agentsAPI.delete(id);
      toast.warning('Agent supprimé', `${name} a été supprimé du système`);
      await load(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error('Erreur', err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggle = async (id: number, name: string, isActive: boolean) => {
    try {
      await agentsAPI.toggleActive(id);
      toast.info(
        isActive ? 'Agent désactivé' : 'Agent activé',
        `${name} ${isActive ? 'ne peut plus se connecter' : 'peut maintenant se connecter'}`
      );
      await load(true);
    } catch (e) { console.error(e); }
  };

  const viewSales = async (agent: User) => {
    setSelectedAgent(agent);
    setSalesLoading(true);
    setAgentSales([]);
    setSalesSearch('');
    try {
      const r    = await agentsAPI.getSales(agent.id);
      const body = r.data as Record<string, unknown>;
      const list = Array.isArray(body?.data) ? (body.data as Sale[]) : [];
      setAgentSales(list);
    } catch (e) { console.error(e); }
    finally { setSalesLoading(false); }
  };

  const activeCount  = agents.filter(a => a.is_active).length;
  const totalRevenue = agents.reduce((s, a) => s + (a.total_revenue || 0), 0);
  const totalSales   = agents.reduce((s, a) => s + (a.total_sales || 0), 0);

  // Filtrage ventes agent dans la modal
  const filteredAgentSales = salesSearch
    ? agentSales.filter(s =>
        String(s.id).includes(salesSearch) ||
        (s.items || []).some(i => i.product_name.toLowerCase().includes(salesSearch.toLowerCase()))
      )
    : agentSales;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div style={{ width: 40, height: 40, border: '3px solid #dcfce7', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#14532d' }}>Gestion des Agents</h1>
          <p className="text-sm" style={{ color: '#16a34a' }}>
            {agents.length} agent(s) · {activeCount} actif(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary" title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setShowAdd(true); setFormError(''); setForm({ name: '', email: '', password: '', phone: '' }); }} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Ajouter un agent
          </button>
        </div>
      </div>

      {/* Stats globales */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4" style={{ borderColor: '#bbf7d0' }}>
            <p className="text-xs mb-1" style={{ color: '#16a34a' }}>Total agents</p>
            <p className="text-xl font-bold" style={{ color: '#14532d' }}>{agents.length}</p>
            <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>{activeCount} actif(s)</p>
          </div>
          <div className="card p-4" style={{ borderColor: '#bbf7d0' }}>
            <p className="text-xs mb-1" style={{ color: '#16a34a' }}>Total ventes</p>
            <p className="text-xl font-bold" style={{ color: '#14532d' }}>{totalSales}</p>
            <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>toutes opérations</p>
          </div>
          <div className="card p-4" style={{ borderColor: '#bbf7d0' }}>
            <p className="text-xs mb-1" style={{ color: '#16a34a' }}>Revenus totaux</p>
            <p className="text-lg font-bold" style={{ color: '#14532d' }}>{fmt(totalRevenue)}</p>
            <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>tous agents confondus</p>
          </div>
        </div>
      )}

      {/* Erreur API */}
      {apiError && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Grille agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400 card">
            <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun agent enregistré</p>
            <p className="text-xs mt-1">Cliquez sur "Ajouter un agent" pour commencer</p>
          </div>
        ) : agents.map(agent => (
          <div
            key={agent.id}
            className={`card p-5 transition-all ${!agent.is_active ? 'opacity-60 bg-slate-50' : 'hover:shadow-md'}`}
          >
            {/* Header carte */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                >
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight" style={{ color: '#14532d' }}>{agent.name}</h3>
                  <span
                    className="badge text-[10px] mt-0.5"
                    style={agent.is_active
                      ? { background: '#dcfce7', color: '#16a34a' }
                      : { background: '#fef2f2', color: '#ef4444' }}
                  >
                    {agent.is_active ? '● Actif' : '● Inactif'}
                  </span>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => handleToggle(agent.id, agent.name, agent.is_active)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                  title={agent.is_active ? 'Désactiver' : 'Activer'}
                >
                  {agent.is_active
                    ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                    : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => viewSales(agent)}
                  className="p-1.5 hover:bg-sky-50 rounded-lg text-slate-400 hover:text-sky-600 transition"
                  title="Voir les ventes"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(agent.id, agent.name)}
                  className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Infos contact */}
            <div className="space-y-1.5 text-sm text-slate-500 mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate text-xs">{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs">{agent.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-400">Créé le {fmtDate(agent.createdAt || agent.created_at)}</span>
              </div>
            </div>

            {/* Stats ventes */}
              <div className="grid grid-cols-2 gap-2 pt-4" style={{ borderTop: '1px solid #dcfce7' }}>
                <div className="rounded-xl p-3 text-center" style={{ background: '#f0fdf4' }}>
                  <ShoppingCart className="w-4 h-4 mx-auto mb-1" style={{ color: '#16a34a' }} />
                  <p className="text-lg font-bold" style={{ color: '#14532d' }}>{agent.total_sales ?? 0}</p>
                  <p className="text-[10px]" style={{ color: '#16a34a' }}>Ventes</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: '#f0fdf4' }}>
                  <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: '#16a34a' }} />
                  <p className="text-sm font-bold leading-tight" style={{ color: '#14532d' }}>
                    {fmt(agent.total_revenue || 0)}
                  </p>
                  <p className="text-[10px]" style={{ color: '#16a34a' }}>Revenus</p>
                </div>
              </div>
          </div>
        ))}
      </div>

      {/* Modal Ajouter Agent */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-semibold" style={{ color: '#14532d' }}>Nouvel agent</h2>
                <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>Créer un compte agent vendeur</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div>
                <label className="label">Nom complet *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Jean Dupont"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Adresse email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input"
                  placeholder="agent@boutique.com"
                />
              </div>
              <div>
                <label className="label">Mot de passe * (min. 6 caractères)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 py-4" style={{ borderTop: '1px solid #dcfce7' }}>
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="btn-primary flex-1 justify-center disabled:opacity-60"
              >
                <UserPlus className="w-4 h-4" />
                {saving ? 'Création…' : "Créer l'agent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ventes Agent */}
      {selectedAgent && (
        <div className="modal-overlay">
          <div className="modal-box large">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                >
                  {selectedAgent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: '#14532d' }}>
                    Ventes de {selectedAgent.name}
                  </h2>
                  <p className="text-xs" style={{ color: '#16a34a' }}>
                    {agentSales.length} vente(s) · {fmt(agentSales.reduce((s, v) => s + Number(v.total_amount), 0))}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats résumé */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid #dcfce7', background: '#f0fdf4' }}>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: '#14532d' }}>{agentSales.length}</p>
                <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>Total ventes</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: '#14532d' }}>
                  {fmt(agentSales.reduce((s, v) => s + Number(v.total_amount), 0))}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>Total revenus</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: '#14532d' }}>
                  {agentSales.length > 0
                    ? fmt(agentSales.reduce((s, v) => s + Number(v.total_amount), 0) / agentSales.length)
                    : fmt(0)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>Panier moyen</p>
              </div>
            </div>

            {/* Recherche dans les ventes */}
            {agentSales.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-b border-slate-100">
                <div className="relative max-w-xs">
                  <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={salesSearch}
                    onChange={e => setSalesSearch(e.target.value)}
                    placeholder="Rechercher une vente…"
                    className="input pl-9 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Liste ventes */}
            <div className="overflow-y-auto flex-1">
              {salesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-700" />
                </div>
              ) : agentSales.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Aucune vente enregistrée</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">#</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Date</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Articles</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Paiement</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Statut</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgentSales.map(s => {
                      const st = STATUS_MAP[s.status] || STATUS_MAP.pending;
                      return (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-400 text-xs font-mono">#{s.id}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {fmtDateTime(s.createdAt || s.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-medium text-slate-700">
                              {s.items?.length || 0} article(s)
                            </div>
                            {s.items && s.items.length > 0 && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                {s.items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${PAY_COLORS[s.payment_method] || 'bg-slate-100 text-slate-600'}`}>
                              {PAY_LABELS[s.payment_method] || s.payment_method}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">
                            {fmt(Number(s.total_amount))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {filteredAgentSales.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                          Total ({filteredAgentSales.filter(s => s.status === 'completed').length} complétées)
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {fmt(filteredAgentSales.filter(s => s.status === 'completed').reduce((s, v) => s + Number(v.total_amount), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
