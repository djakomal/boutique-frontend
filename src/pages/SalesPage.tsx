import { useEffect, useState, useCallback } from 'react';
import { salesAPI, productsAPI, extractList } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Sale, Product } from '../types';
import {
  Plus, X, ShoppingCart, Trash2, CheckCircle,
  AlertTriangle, Receipt, ChevronDown, Search,
  TrendingUp, DollarSign, Clock, RefreshCw, XCircle,
} from 'lucide-react';
import { useAppToast } from '../components/Layout';

type CartItem = { product: Product; quantity: number };

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n) || 0) + ' FCFA';

const fmtDateTime = (d?: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const PAY_OPTIONS = [
  { value: 'cash',         label: 'Espèces',      color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'mobile_money', label: 'Mobile Money', color: 'bg-sky-50 text-sky-700 border-sky-200'        },
  { value: 'credit',       label: 'Crédit',       color: 'bg-orange-50 text-orange-700 border-orange-200'},
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Complétée',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  pending:   { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-100'       },
  cancelled: { label: 'Annulée',    cls: 'bg-rose-50 text-rose-700 border-rose-100'          },
};

export default function SalesPage() {
  const { isAdmin }          = useAuth();
  const toast                = useAppToast();
  const [sales, setSales]         = useState<Sale[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]       = useState('');
  const [payFilter, setPayFilter] = useState('');

  // Panier
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [selProd, setSelProd]     = useState('');
  const [quantity, setQuantity]   = useState(1);
  const [payMethod, setPayMethod] = useState<'cash' | 'mobile_money' | 'credit'>('cash');
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [confirmedTotal, setConfirmedTotal] = useState(0); // Montant confirmé de la vente
  const [cartError, setCartError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setApiError('');
    try {
      const [sRes, pRes] = await Promise.all([
        isAdmin ? salesAPI.getAll() : salesAPI.getMine(),
        productsAPI.getAll(),
      ]);
      setSales(extractList<Sale>(sRes));
      setProducts(extractList<Product>(pRes));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setApiError(err.response?.data?.message || err.message || 'Erreur de connexion');
      setSales([]); setProducts([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const available = products.filter(p => Number(p.stock) > 0 && p.is_active);

  const addToCart = () => {
    const prod = products.find(p => p.id === Number(selProd));
    if (!prod)            { setCartError('Sélectionnez un produit'); return; }
    if (quantity <= 0)    { setCartError('Quantité invalide'); return; }
    if (quantity > Number(prod.stock)) {
      setCartError(`Stock insuffisant (disponible: ${prod.stock} ${prod.unit})`);
      return;
    }
    setCartError('');
    const existing = cart.find(c => c.product.id === prod.id);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > Number(prod.stock)) {
        setCartError(`Stock insuffisant (disponible: ${prod.stock} ${prod.unit})`);
        return;
      }
      setCart(cart.map(c => c.product.id === prod.id ? { ...c, quantity: newQty } : c));
    } else {
      setCart([...cart, { product: prod, quantity }]);
    }
    setQuantity(1); setSelProd('');
  };

  const total = cart.reduce((s, c) => s + Number(c.product.selling_price) * c.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) { setCartError('Ajoutez au moins un produit'); return; }
    setSaving(true); setCartError('');
    try {
      await salesAPI.create({
        items: cart.map(c => ({
          product_id:   c.product.id,
          product_name: c.product.name,
          quantity:     c.quantity,
          unit:         c.product.unit,
          unit_price:   Number(c.product.selling_price),
          total:        Number(c.product.selling_price) * c.quantity,
        })),
        total_amount:   total,
        payment_method: payMethod,
        note,
      });
      setSuccess(true);
      setConfirmedTotal(total); // Sauvegarder le montant avant de vider le panier
      toast.success('Vente enregistrée !', `${cart.length} article(s) · ${fmt(total)}`);
      setCart([]); setNote(''); setPayMethod('cash');
      await load(true);
      setTimeout(() => { setSuccess(false); setShowModal(false); }, 2500);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Erreur lors de la vente';
      setCartError(msg);
      toast.error('Erreur de vente', msg);
    } finally { setSaving(false); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Annuler cette vente ? Les stocks seront restaurés.')) return;
    try {
      await salesAPI.cancel(id);
      toast.warning('Vente annulée', 'Les stocks ont été restaurés');
      await load(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error('Erreur', err.response?.data?.message || 'Impossible d\'annuler');
    }
  };

  const openModal = () => {
    setShowModal(true); setCart([]); setCartError('');
    setSuccess(false); setNote(''); setPayMethod('cash'); setSelProd(''); setQuantity(1);
    setConfirmedTotal(0);
  };

  // Stats rapides
  const completed    = sales.filter(s => s.status === 'completed');
  const totalRevenue = completed.reduce((s, v) => s + Number(v.total_amount), 0);
  const todaySales   = completed.filter(s => {
    const d = new Date(s.createdAt || s.created_at || '');
    return d.toDateString() === new Date().toDateString();
  });

  // Filtrage
  const filtered = sales.filter(s => {
    const q    = search.toLowerCase();
    const matchSearch = !search || (
      String(s.id).includes(q) ||
      (s.agent?.name || s.agent_name || '').toLowerCase().includes(q) ||
      (s.items || []).some(i => i.product_name.toLowerCase().includes(q)) ||
      (s.payment_method || '').toLowerCase().includes(q)
    );
    const matchPay = !payFilter || s.payment_method === payFilter;
    return matchSearch && matchPay;
  });

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
          <h1 className="text-xl font-bold" style={{ color: '#14532d' }}>
            {isAdmin ? 'Toutes les ventes' : 'Mes ventes'}
          </h1>
          <p className="text-sm" style={{ color: '#16a34a' }}>{sales.length} vente(s) enregistrée(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary" title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {!isAdmin && (
            <button onClick={openModal} className="btn-primary">
              <Plus className="w-4 h-4" /> Nouvelle vente
            </button>
          )}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4" style={{ borderColor: '#bbf7d0' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
              <ShoppingCart className="w-4 h-4" style={{ color: '#16a34a' }} />
            </div>
            <p className="text-xs" style={{ color: '#16a34a' }}>Total ventes</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#14532d' }}>{sales.length}</p>
          <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>{completed.length} complétées</p>
        </div>
        <div className="card p-4" style={{ borderColor: '#bbf7d0' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
              <DollarSign className="w-4 h-4" style={{ color: '#16a34a' }} />
            </div>
            <p className="text-xs" style={{ color: '#16a34a' }}>Total revenus</p>
          </div>
          <p className="text-lg font-bold" style={{ color: '#14532d' }}>{fmt(totalRevenue)}</p>
          <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>ventes complétées</p>
        </div>
        <div className="card p-4" style={{ borderColor: '#bbf7d0' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
              <Clock className="w-4 h-4" style={{ color: '#16a34a' }} />
            </div>
            <p className="text-xs" style={{ color: '#16a34a' }}>Aujourd'hui</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#14532d' }}>{todaySales.length}</p>
          <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>{fmt(todaySales.reduce((s,v)=>s+Number(v.total_amount),0))}</p>
        </div>
      </div>

      {/* Erreur API */}
      {apiError && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError} — Vérifiez que le serveur backend est démarré sur le port 5000.</span>
        </div>
      )}

      {/* Filtres */}
      {sales.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par agent, produit, n° vente…"
              className="input pl-9"
            />
          </div>
          <select
            value={payFilter}
            onChange={e => setPayFilter(e.target.value)}
            className="input sm:w-44"
          >
            <option value="">Tous paiements</option>
            <option value="cash">Espèces</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="credit">Crédit</option>
          </select>
        </div>
      )}

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>index</th>
                <th className="text-left">Date</th>
                {isAdmin && <th className="text-left">Agent</th>}
                <th className="text-left">Articles</th>
                <th className="text-left">Paiement</th>
                <th className="text-left">Statut</th>
                <th className="text-right">Montant</th>
                {isAdmin && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="text-center py-16 text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      {sales.length === 0 ? 'Aucune vente enregistrée' : 'Aucun résultat'}
                    </p>
                    {!isAdmin && sales.length === 0 && (
                      <p className="text-xs mt-1">Cliquez sur "Nouvelle vente" pour commencer</p>
                    )}
                  </td>
                </tr>
              ) : filtered.map(s => {
                const pay = PAY_OPTIONS.find(p => p.value === s.payment_method);
                const st  = STATUS_MAP[s.status] || STATUS_MAP.pending;
                return (
                  <tr key={s.id}>
                    <td className="text-slate-400 font-mono text-xs">{s.id}</td>
                    <td className="text-slate-500 text-xs whitespace-nowrap">
                      {fmtDateTime(s.createdAt || s.created_at)}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
                          >
                            {(s.agent?.name || s.agent_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-xs" style={{ color: '#14532d' }}>
                            {s.agent?.name || s.agent_name}
                          </span>
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="text-slate-700 font-medium">{s.items?.length || 0} article(s)</div>
                      {s.items && s.items.length > 0 && (
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {s.items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge border ${pay?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {pay?.label || s.payment_method}
                      </span>
                    </td>
                    <td>
                      <span className={`badge border ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="text-right font-bold text-slate-800">
                      {fmt(Number(s.total_amount))}
                    </td>
                    {isAdmin && (
                      <td className="text-right">
                        {s.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(s.id)}
                            className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition"
                            title="Annuler la vente"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={isAdmin ? 7 : 5} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total affiché ({filtered.length} ventes)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    {fmt(filtered.filter(s=>s.status==='completed').reduce((s, v) => s + Number(v.total_amount), 0))}
                  </td>
                  {isAdmin && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Nouvelle Vente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box large">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Nouvelle vente</h2>
                  <p className="text-xs text-slate-400">
                    {available.length} produit(s) disponible(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="p-16 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <p className="text-xl font-bold text-slate-800">Vente enregistrée !</p>
                <p className="text-slate-500 text-sm">
                  Montant : <span className="font-bold text-slate-800">{fmt(confirmedTotal)}</span>
                </p>
                <p className="text-xs text-slate-400">Fermeture automatique…</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {cartError && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {cartError}
                  </div>
                )}

                {/* Sélection produit */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                    <ShoppingCart className="w-3.5 h-3.5" /> Ajouter au panier
                  </p>
                  <div className="flex gap-3 items-end flex-wrap">
                    <div className="flex-1 min-w-48">
                      <label className="label">Produit</label>
                      <div className="relative">
                        <select
                          value={selProd}
                          onChange={e => setSelProd(e.target.value)}
                          className="input appearance-none pr-8"
                          autoFocus
                        >
                          <option value="">-- Sélectionner un produit --</option>
                          {available.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — stock: {p.stock} {p.unit} — {fmt(Number(p.selling_price))}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="w-28">
                      <label className="label">Quantité</label>
                      <input
                        type="number" min="1"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="input"
                      />
                    </div>
                    <button
                      onClick={addToCart}
                      disabled={!selProd}
                      className="btn-primary disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Ajouter
                    </button>
                  </div>
                </div>

                {/* Panier */}
                {cart.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Panier — {cart.length} article(s)
                      </p>
                      <span className="text-xs font-bold text-slate-700">{fmt(total)}</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        {cart.map(c => (
                          <tr key={c.product.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-700">{c.product.name}</div>
                              <div className="text-xs text-slate-400">{c.product.category}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    if (c.quantity > 1) setCart(cart.map(x => x.product.id === c.product.id ? { ...x, quantity: x.quantity - 1 } : x));
                                  }}
                                  className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-xs hover:bg-slate-200"
                                >-</button>
                                <span className="font-medium">{c.quantity}</span>
                                <button
                                  onClick={() => {
                                    if (c.quantity < Number(c.product.stock)) setCart(cart.map(x => x.product.id === c.product.id ? { ...x, quantity: x.quantity + 1 } : x));
                                  }}
                                  className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-xs hover:bg-slate-200"
                                >+</button>
                                <span className="text-slate-400 text-xs">{c.product.unit}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                              × {fmt(Number(c.product.selling_price))}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                              {fmt(Number(c.product.selling_price) * c.quantity)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => setCart(cart.filter(x => x.product.id !== c.product.id))}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200">
                          <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-700 text-sm">
                            TOTAL À PAYER
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-xl text-slate-800">
                            {fmt(total)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Paiement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Mode de paiement</label>
                    <div className="flex flex-col gap-2">
                      {PAY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPayMethod(opt.value as typeof payMethod)}
                          className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition ${
                            payMethod === opt.value
                              ? 'border-slate-700 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Note (optionnel)</label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="input resize-none"
                      rows={5}
                      placeholder="Remarque sur la vente…"
                    />
                  </div>
                </div>

                {/* Récap total */}
                {cart.length > 0 && (
                  <div className="bg-slate-900 text-white rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-300" />
                      <span className="text-sm font-medium text-slate-300">Total vente</span>
                    </div>
                    <span className="text-lg font-bold">{fmt(total)}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving || cart.length === 0}
                    className="btn-primary flex-1 justify-center disabled:opacity-60"
                  >
                    {saving ? 'Enregistrement…' : `Valider · ${fmt(total)}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
