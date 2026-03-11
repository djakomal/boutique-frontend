import { useEffect, useState } from 'react';
import { productsAPI, extractList } from '../services/api';
import { Product } from '../types';
import {
  Plus, Search, Edit2, Trash2, AlertTriangle, X, Save,
  Package, Filter, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppToast } from '../components/Layout';

const CATEGORIES = [
  'Céréales', 'Légumineuses', 'Huiles', 'Farines', 'Épices',
  'Boissons', 'Conserves', 'Surgelés', 'Produits laitiers', 'Autres',
];
const UNITS = ['kg', 'g', 'litre', 'cl', 'pièce', 'carton', 'sac', 'boîte', 'bouteille', 'sachet'];

const emptyForm = {
  name: '', category: 'Céréales', unit: 'kg',
  purchase_price: 0, selling_price: 0, stock: 0,
  min_stock: 5, expiry_date: '', barcode: '', description: '',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n) || 0) + ' FCFA';

export default function ProductsPage() {
  const { isAdmin }      = useAuth();
  const toast            = useAppToast();
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'low'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Product | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [apiError, setApiError]   = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setApiError('');
    try {
      const r    = await productsAPI.getAll();
      const list = extractList<Product>(r);
      setProducts(list);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Erreur de connexion au serveur';
      setApiError(msg);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => {
    const q   = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.barcode || '').includes(q);
    const matchCat    = !catFilter || p.category === catFilter;
    const isLow       = Number(p.stock) <= Number(p.min_stock);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'low' ? isLow : !isLow);
    return matchSearch && matchCat && matchStatus;
  });

  const openAdd = () => {
    setEditing(null); setForm(emptyForm); setError(''); setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name:           p.name,
      category:       p.category,
      unit:           p.unit,
      purchase_price: Number(p.purchase_price),
      selling_price:  Number(p.selling_price),
      stock:          Number(p.stock),
      min_stock:      Number(p.min_stock),
      expiry_date:    p.expiry_date || '',
      barcode:        p.barcode || '',
      description:    p.description || '',
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim())               { setError('Le nom du produit est obligatoire'); return; }
    if (Number(form.selling_price) <= 0) { setError('Le prix de vente doit être supérieur à 0'); return; }
    setSaving(true);
    try {
      if (editing) {
        await productsAPI.update(editing.id, form);
        toast.success('Produit modifié', `"${form.name}" a été mis à jour`);
      } else {
        await productsAPI.create(form);
        toast.success('Produit créé', `"${form.name}" a été ajouté au catalogue`);
      }
      setShowModal(false);
      await load(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: { msg: string }[] } } };
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Désactiver "${name}" ?`)) return;
    try {
      await productsAPI.delete(id);
      toast.warning('Produit désactivé', `"${name}" a été retiré du catalogue`);
      await load(true);
    } catch (e) {
      toast.error('Erreur', 'Impossible de désactiver ce produit');
      console.error(e);
    }
  };

  const categories = [...new Set(products.map(p => p.category))].sort();
  const lowCount   = products.filter(p => Number(p.stock) <= Number(p.min_stock)).length;
  const totalValue = products.reduce((s, p) => s + Number(p.stock) * Number(p.purchase_price), 0);

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
          <h1 className="text-xl font-bold" style={{ color: '#14532d' }}>Produits alimentaires</h1>
          <p className="text-sm" style={{ color: '#16a34a' }}>
            {products.length} produit(s) · valeur stock : {fmt(totalValue)}
            {lowCount > 0 && (
              <span className="ml-2 font-medium" style={{ color: '#ef4444' }}>
                · {lowCount} stock(s) critique(s)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <button onClick={openAdd} className="btn-primary">
              <Plus className="w-4 h-4" /> Nouveau produit
            </button>
          )}
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit, code barre…"
            className="input pl-9"
          />
        </div>
        <div className="relative sm:w-52">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="input pl-9 pr-8 appearance-none"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
        <div className="flex gap-1 rounded-lg p-1" style={{ background: '#fff', border: '1px solid #bbf7d0' }}>
          {[
            { v: 'all', l: 'Tous'     },
            { v: 'ok',  l: 'Normal'   },
            { v: 'low', l: 'Critique' },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setStatusFilter(opt.v as typeof statusFilter)}
              className="px-3 py-1.5 rounded text-xs font-medium transition whitespace-nowrap"
              style={statusFilter === opt.v
                ? { background: '#16a34a', color: '#fff' }
                : { color: '#166534' }}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Produit</th>
                <th className="text-left">Catégorie</th>
                <th className="text-left">Unité</th>
                <th className="text-right">Prix achat</th>
                <th className="text-right">Prix vente</th>
                <th className="text-right">Marge</th>
                <th className="text-right">Stock</th>
                <th className="text-left">Statut</th>
                {isAdmin && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      {products.length === 0 ? 'Aucun produit enregistré' : 'Aucun résultat pour cette recherche'}
                    </p>
                    {products.length === 0 && isAdmin && (
                      <p className="text-xs mt-1">Cliquez sur "Nouveau produit" pour commencer</p>
                    )}
                  </td>
                </tr>
              ) : filtered.map(p => {
                const isLow  = Number(p.stock) <= Number(p.min_stock);
                const marge  = Number(p.selling_price) - Number(p.purchase_price);
                const margePct = Number(p.purchase_price) > 0
                  ? Math.round((marge / Number(p.purchase_price)) * 100)
                  : 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="font-medium" style={{ color: '#14532d' }}>{p.name}</span>
                      {p.barcode && (
                        <span className="ml-2 text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">
                          #{p.barcode}
                        </span>
                      )}
                      {p.expiry_date && (() => {
                        const exp  = new Date(p.expiry_date);
                        const now  = new Date();
                        const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <div className={`text-xs mt-0.5 flex items-center gap-1 ${diff <= 30 ? 'text-rose-600' : 'text-amber-600'}`}>
                            <span>⏱</span>
                            Exp: {exp.toLocaleDateString('fr-FR')}
                            {diff <= 30 && <span className="font-semibold">({diff}j)</span>}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <span className="badge" style={{ background: '#dcfce7', color: '#166634' }}>{p.category}</span>
                    </td>
                    <td style={{ color: '#16a34a' }}>{p.unit}</td>
                    <td className="text-right" style={{ color: '#86efac' }}>{fmt(Number(p.purchase_price))}</td>
                    <td className="text-right font-semibold" style={{ color: '#14532d' }}>{fmt(Number(p.selling_price))}</td>
                    <td className="text-right">
                      <span className="text-xs font-medium" style={{ color: marge > 0 ? '#16a34a' : '#ef4444' }}>
                        +{margePct}%
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="font-bold" style={{ color: isLow ? '#ef4444' : '#14532d' }}>
                        {isLow && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                        {p.stock} {p.unit}
                      </span>
                      <div className="text-[10px]" style={{ color: '#86efac' }}>min: {p.min_stock}</div>
                    </td>
                    <td>
                      {isLow
                        ? <span className="badge" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>Critique</span>
                        : <span className="badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>Normal</span>
                      }
                    </td>
                    {isAdmin && (
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition"
                            title="Désactiver"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-2.5 text-right text-xs text-slate-400">
                    {filtered.length} produit(s) affiché(s)
                    {filtered.length !== products.length && ` sur ${products.length}`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Modal Ajouter / Modifier ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-8"
          style={{ background: 'transparent' }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '580px',
              maxHeight: '90vh',       /* ← limite la hauteur */
              display: 'flex',
              flexDirection: 'column', /* ← header / body / footer empilés */
              overflow: 'hidden',
            }}
          >
            {/* Header — fixe */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid #dcfce7',
                flexShrink: 0,
              }}
            >
              <div>
                <h2 className="font-semibold" style={{ color: '#14532d' }}>
                  {editing ? 'Modifier le produit' : 'Nouveau produit'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>
                  {editing ? `Modification de "${editing.name}"` : 'Remplissez les informations du produit'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="p-4 sm:p-6" style={{ overflowY: 'auto', flex: 1 }}>
              {error && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm mb-4">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nom du produit *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="Ex: Riz parfumé 25kg"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="input"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unité de mesure</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="input"
                  >
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Prix d'achat (FCFA)</label>
                  <input
                    type="number" min="0"
                    value={form.purchase_price}
                    onChange={e => setForm({ ...form, purchase_price: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Prix de vente (FCFA) *</label>
                  <input
                    type="number" min="0"
                    value={form.selling_price}
                    onChange={e => setForm({ ...form, selling_price: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                {form.purchase_price > 0 && form.selling_price > 0 && (
                  <div className="sm:col-span-2">
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                      style={form.selling_price > form.purchase_price
                        ? { background: '#dcfce7', color: '#166534' }
                        : { background: '#fef2f2', color: '#ef4444' }}
                    >
                      <span>Marge :</span>
                      <span className="font-bold">
                        {fmt(form.selling_price - form.purchase_price)}
                        {' '}({Math.round(((form.selling_price - form.purchase_price) / form.purchase_price) * 100)}%)
                      </span>
                    </div>
                  </div>
                )}
                {!editing && (
                  <div>
                    <label className="label">Stock initial</label>
                    <input
                      type="number" min="0"
                      value={form.stock}
                      onChange={e => setForm({ ...form, stock: Number(e.target.value) })}
                      className="input"
                    />
                  </div>
                )}
                <div>
                  <label className="label">Seuil d'alerte stock</label>
                  <input
                    type="number" min="0"
                    value={form.min_stock}
                    onChange={e => setForm({ ...form, min_stock: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Date d'expiration</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Code barre</label>
                  <input
                    value={form.barcode}
                    onChange={e => setForm({ ...form, barcode: e.target.value })}
                    className="input"
                    placeholder="Optionnel"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="input resize-none"
                    rows={2}
                    placeholder="Description optionnelle…"
                  />
                </div>
              </div>
            </div>

            {/* Footer — fixe, toujours visible */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #dcfce7',
                flexShrink: 0,         /* ← ne se compresse jamais */
                background: '#fff',
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 justify-center disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
