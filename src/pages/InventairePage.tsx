import { useEffect, useState } from 'react';
import { stockAPI, productsAPI, extractList } from '../services/api';
import { Product, StockMovement } from '../types';
import {
  Plus, X, Package, ArrowDown, ArrowUp,
  AlertTriangle, ClipboardList, TrendingDown, RefreshCw,
} from 'lucide-react';
import { useAppToast } from '../components/Layout';

const REASONS_IN  = ['Réapprovisionnement', 'Retour fournisseur', 'Correction inventaire', 'Don reçu'];
const REASONS_OUT = ['Perte / Péremption', 'Correction inventaire', 'Don / Échantillon', 'Transfert'];
const REASONS_ADJ = ['Inventaire physique', 'Correction erreur', 'Ajustement système'];

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  catch { return '—'; }
};

const TYPES = [
  { v: 'in',         l: 'Entrée',      desc: 'Ajout de stock',       active: 'border-emerald-400 bg-emerald-50 text-emerald-700'  },
  { v: 'out',        l: 'Sortie',      desc: 'Retrait de stock',     active: 'border-rose-400 bg-rose-50 text-rose-700'            },
  { v: 'loss',       l: 'Perte',       desc: 'Produit perdu/périmé', active: 'border-amber-400 bg-amber-50 text-amber-700'         },
  { v: 'adjustment', l: 'Ajustement',  desc: 'Stock direct',         active: 'border-sky-400 bg-sky-50 text-sky-700'               },
];

export default function InventairePage() {
  const toast = useAppToast();
  const [products, setProducts]     = useState<Product[]>([]);
  const [movements, setMovements]   = useState<StockMovement[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError]     = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({
    product_id: '',
    type: 'in' as 'in' | 'out' | 'adjustment' | 'loss',
    quantity: 1,
    reason: '',
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<'stock' | 'movements'>('stock');
  const [typeFilter, setTypeFilter] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setApiError('');
    try {
      const [pRes, mRes] = await Promise.all([
        productsAPI.getAll(),
        stockAPI.getMovements(),
      ]);
      setProducts(extractList<Product>(pRes));
      setMovements(extractList<StockMovement>(mRes));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setApiError(err.response?.data?.message || err.message || 'Erreur de connexion');
      setProducts([]); setMovements([]);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.product_id) { setError('Sélectionnez un produit'); return; }
    if (!form.reason)     { setError('Indiquez un motif'); return; }
    if (form.quantity <= 0) { setError('Quantité invalide'); return; }
    setSaving(true); setError('');
    try {
      await stockAPI.addMovement(form);
      const typeLabel = TYPES.find(t => t.v === form.type)?.l || form.type;
      const prodName  = products.find(p => String(p.id) === form.product_id)?.name || '';
      toast.success('Mouvement enregistré', `${typeLabel} — ${prodName}`);
      setShowModal(false);
      setForm({ product_id: '', type: 'in', quantity: 1, reason: '' });
      await load(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Erreur lors du mouvement de stock';
      setError(msg);
      toast.error('Erreur', msg);
    } finally { setSaving(false); }
  };

  const lowStock = products.filter(p => Number(p.stock) <= Number(p.min_stock));

  const stockStatus = (p: Product) => {
    const st  = Number(p.stock);
    const min = Number(p.min_stock);
    if (st <= min)     return { label: 'Critique', cls: 'bg-rose-50 text-rose-600 border-rose-100',         bar: 'bg-rose-400'    };
    if (st <= min * 2) return { label: 'Faible',   cls: 'bg-amber-50 text-amber-600 border-amber-100',     bar: 'bg-amber-400'   };
    return               { label: 'Normal',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', bar: 'bg-emerald-400' };
  };

  const getReasonsForType = (type: string) =>
    type === 'in' ? REASONS_IN : type === 'adjustment' ? REASONS_ADJ : REASONS_OUT;

  const filteredMovements = typeFilter
    ? movements.filter(m => m.type === typeFilter)
    : movements;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-700" />
      </div>
    );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inventaire</h1>
          <p className="text-slate-500 text-sm">
            {products.length} produit(s)
            {lowStock.length > 0 && (
              <span className="ml-2 text-rose-600 font-medium">
                · {lowStock.length} alerte(s) critique(s)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary" title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowModal(true); setError(''); setForm({ product_id: '', type: 'in', quantity: 1, reason: '' }); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Mouvement de stock
          </button>
        </div>
      </div>

      {/* Erreur API */}
      {apiError && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Alertes stocks critiques */}
      {lowStock.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-rose-700 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Stocks critiques ({lowStock.length} produit(s))
          </h3>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(p => (
              <span key={p.id} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                {p.name} — {p.stock} {p.unit} <span className="text-rose-400">(min: {p.min_stock})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-slate-400" />
            <p className="text-xs text-slate-500">Total produits</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{products.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{products.filter(p => p.is_active).length} actifs</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <p className="text-xs text-slate-500">Stocks critiques</p>
          </div>
          <p className={`text-xl font-bold ${lowStock.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {lowStock.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">à réapprovisionner</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-slate-400" />
            <p className="text-xs text-slate-500">Mouvements</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{movements.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">total enregistrés</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: 'stock',     icon: Package,       label: 'État des stocks'       },
          { key: 'movements', icon: ClipboardList, label: `Historique (${movements.length})` },
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

      {/* Tab État des stocks */}
      {tab === 'stock' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Produit</th>
                  <th className="text-left">Catégorie</th>
                  <th className="text-left">Unité</th>
                  <th className="text-right">Stock actuel</th>
                  <th className="text-right">Seuil alerte</th>
                  <th className="text-left" style={{ width: '120px' }}>Niveau</th>
                  <th className="text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Aucun produit</p>
                    </td>
                  </tr>
                ) : products.map(p => {
                  const st   = stockStatus(p);
                  const stock = Number(p.stock);
                  const min   = Number(p.min_stock);
                  const pct   = min > 0 ? Math.min(100, Math.round((stock / (min * 3)) * 100)) : 100;
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="font-medium text-slate-800">{p.name}</span>
                        {p.expiry_date && (
                          <div className="text-xs text-amber-600 mt-0.5">
                            ⏱ Exp: {new Date(p.expiry_date).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-slate-100 text-slate-600">{p.category}</span>
                      </td>
                      <td className="text-slate-500">{p.unit}</td>
                      <td className={`text-right font-bold ${Number(p.stock) <= Number(p.min_stock) ? 'text-rose-600' : 'text-slate-700'}`}>
                        {p.stock}
                      </td>
                      <td className="text-right text-slate-400">{p.min_stock}</td>
                      <td>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${st.bar}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{pct}%</div>
                      </td>
                      <td>
                        <span className={`badge border ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Historique */}
      {tab === 'movements' && (
        <div className="space-y-3">
          {/* Filtre type */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
            {[
              { v: '',           l: 'Tous'         },
              { v: 'in',         l: 'Entrées'      },
              { v: 'out',        l: 'Sorties'      },
              { v: 'loss',       l: 'Pertes'       },
              { v: 'adjustment', l: 'Ajustements'  },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => setTypeFilter(opt.v)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition whitespace-nowrap ${
                  typeFilter === opt.v
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Produit</th>
                    <th className="text-left">Type</th>
                    <th className="text-right">Quantité</th>
                    <th className="text-right">Avant → Après</th>
                    <th className="text-left">Motif</th>
                    <th className="text-left">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">Aucun mouvement enregistré</p>
                      </td>
                    </tr>
                  ) : filteredMovements.map(m => (
                    <tr key={m.id}>
                      <td className="text-slate-500 text-xs whitespace-nowrap">
                        {fmtDate(m.createdAt || m.created_at)}
                      </td>
                      <td className="font-medium text-slate-700">{m.product_name}</td>
                      <td>
                        <span className={`badge border flex items-center gap-1 w-fit ${
                          m.type === 'in'         ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          m.type === 'out'        ? 'bg-rose-50 text-rose-700 border-rose-100'          :
                          m.type === 'loss'       ? 'bg-amber-50 text-amber-700 border-amber-100'       :
                                                    'bg-sky-50 text-sky-700 border-sky-100'
                        }`}>
                          {m.type === 'in'
                            ? <ArrowDown className="w-3 h-3" />
                            : <ArrowUp className="w-3 h-3" />}
                          {m.type === 'in' ? 'Entrée' : m.type === 'out' ? 'Sortie' : m.type === 'loss' ? 'Perte' : 'Ajust.'}
                        </span>
                      </td>
                      <td className={`text-right font-semibold ${m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.type === 'in' ? '+' : '-'}{m.quantity} {m.unit}
                      </td>
                      <td className="text-right text-slate-400 font-mono text-xs">
                        {m.stock_before} → {m.stock_after}
                      </td>
                      <td className="text-slate-500 text-xs">{m.reason}</td>
                      <td className="text-slate-500 text-xs">{m.agent_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mouvement de stock */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-semibold text-slate-800">Mouvement de stock</h2>
                <p className="text-xs text-slate-400 mt-0.5">Enregistrer une entrée, sortie ou ajustement</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="label">Produit *</label>
                <select
                  value={form.product_id}
                  onChange={e => setForm({ ...form, product_id: e.target.value })}
                  className="input"
                >
                  <option value="">-- Sélectionner un produit --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Type de mouvement</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.v as typeof form.type, reason: '' })}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition text-left ${
                        form.type === t.v ? t.active : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <div>{t.l}</div>
                      <div className="text-[10px] font-normal opacity-70 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  {form.type === 'adjustment' ? 'Nouveau stock total' : 'Quantité'}
                </label>
                <input
                  type="number" min="1"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="input"
                  placeholder={form.type === 'adjustment' ? 'Stock exact final' : "Nombre d'unités"}
                />
                {/* Aperçu du stock résultant */}
                {form.product_id && (() => {
                  const prod = products.find(p => String(p.id) === form.product_id);
                  if (!prod) return null;
                  const current = Number(prod.stock);
                  let after = current;
                  if (form.type === 'in')         after = current + form.quantity;
                  else if (form.type === 'out' || form.type === 'loss') after = current - form.quantity;
                  else if (form.type === 'adjustment') after = form.quantity;
                  return (
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                      Stock actuel: <span className="font-medium">{current} {prod.unit}</span>
                      <span className="mx-1">→</span>
                      <span className={`font-bold ${after < 0 ? 'text-rose-600' : after <= Number(prod.min_stock) ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {after} {prod.unit}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="label">Motif *</label>
                <select
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="input"
                >
                  <option value="">-- Sélectionner un motif --</option>
                  {getReasonsForType(form.type).map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary flex-1 justify-center disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : 'Valider le mouvement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
