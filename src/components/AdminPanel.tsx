import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Download,
  Edit3,
  KeyRound,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Utensils,
  X
} from 'lucide-react';
import { AdminStoreSummary, StoreInfo } from '../types';
import { checkSupabase, deleteAdminStoreSupabase, fetchAdminStores, updateAdminStoreSupabase } from '../supabaseService';
import { getEmployees, getMenuItems, getOrders, getStoreInfo, saveStoreInfo } from '../mockData';

const ADMIN_PASSWORD = 'Leo12345';

const buildLocalAdminStore = (): AdminStoreSummary => {
  const store = getStoreInfo();
  const employees = getEmployees();
  const menuItems = getMenuItems();
  const orders = getOrders();
  const completedOrders = orders.filter(order => order.status === 'completed');

  return {
    id: 'local',
    ...store,
    ownerEmail: 'local@maestriabeach.dev',
    createdAt: undefined,
    employeesCount: employees.length,
    menuItemsCount: menuItems.length,
    activeOrdersCount: orders.filter(order => order.status === 'active').length,
    completedOrdersCount: completedOrders.length,
    totalRevenue: completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  };
};

const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('mb_admin_auth') === 'true');
  const [password, setPassword] = useState('');
  const [stores, setStores] = useState<AdminStoreSummary[]>([]);
  const [selectedStore, setSelectedStore] = useState<AdminStoreSummary | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStores = async () => {
    setLoading(true);
    setError('');

    try {
      const remoteStores = checkSupabase() ? await fetchAdminStores() : [];
      setStores(remoteStores.length > 0 ? remoteStores : [buildLocalAdminStore()]);
    } catch (loadError) {
      console.error(loadError);
      setError('Nao foi possivel carregar as barracas. Verifique Supabase/RLS.');
      setStores([buildLocalAdminStore()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStores();
    }
  }, [isAuthenticated]);

  const filteredStores = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stores;

    return stores.filter(store =>
      [store.name, store.tenantCode, store.ownerEmail, store.address]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    );
  }, [stores, search]);

  const totals = useMemo(() => {
    return stores.reduce(
      (acc, store) => ({
        stores: acc.stores + 1,
        employees: acc.employees + store.employeesCount,
        menuItems: acc.menuItems + store.menuItemsCount,
        activeOrders: acc.activeOrders + store.activeOrdersCount,
        revenue: acc.revenue + store.totalRevenue
      }),
      { stores: 0, employees: 0, menuItems: 0, activeOrders: 0, revenue: 0 }
    );
  }, [stores]);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('mb_admin_auth', 'true');
      setIsAuthenticated(true);
      return;
    }

    setError('Senha admin incorreta.');
  };

  const handleSaveStore = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStore) return;

    const payload: StoreInfo & { ownerEmail?: string } = {
      name: selectedStore.name,
      logoUrl: selectedStore.logoUrl,
      address: selectedStore.address,
      phone: selectedStore.phone,
      tablesCount: Number(selectedStore.tablesCount),
      serviceChargePercent: Number(selectedStore.serviceChargePercent),
      tenantCode: selectedStore.tenantCode,
      themeColor: selectedStore.themeColor,
      categories: selectedStore.categories,
      ownerEmail: selectedStore.ownerEmail
    };

    setLoading(true);
    const success = selectedStore.id === 'local'
      ? (saveStoreInfo(payload), true)
      : await updateAdminStoreSupabase(selectedStore.id, payload);
    setLoading(false);

    if (!success) {
      setError('Nao foi possivel salvar a barraca. Verifique permissoes do Supabase.');
      return;
    }

    setSelectedStore(null);
    await loadStores();
  };

  const handleDeleteStore = async (store: AdminStoreSummary) => {
    const confirmed = confirm(`Excluir definitivamente a barraca "${store.name}" e todos os dados vinculados?`);
    if (!confirmed) return;

    setLoading(true);
    const success = store.id === 'local'
      ? (['mb_store_info', 'mb_menu_items', 'mb_employees', 'mb_orders', 'mb_sales'].forEach(key => localStorage.removeItem(key)), true)
      : await deleteAdminStoreSupabase(store.id);
    setLoading(false);

    if (!success) {
      setError('Nao foi possivel excluir a barraca. Verifique permissoes do Supabase.');
      return;
    }

    setSelectedStore(null);
    await loadStores();
  };

  const exportStores = () => {
    const blob = new Blob([JSON.stringify(stores, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maestria-admin-stores-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <main className="admin-login-page">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <span className="wordmark-mark">MB</span>
          <h1>Painel Admin</h1>
          <p>Acesso interno para gerenciamento das barracas cadastradas no Maestria Beach.</p>
          {error && <div className="auth-error">{error}</div>}
          <label>
            Senha de administrador
            <span className="input-icon">
              <KeyRound size={16} />
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoFocus
                placeholder="Digite a senha"
              />
            </span>
          </label>
          <button className="btn btn-primary" type="submit">
            <ShieldCheck size={17} /> Entrar no admin
          </button>
          <button className="btn btn-outline" type="button" onClick={() => window.location.assign('/')}>
            <ArrowLeft size={16} /> Voltar ao sistema
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <span className="section-eyebrow">Admin interno</span>
          <h1>Controle das barracas</h1>
        </div>
        <div className="admin-actions">
          <button className="btn btn-outline" onClick={loadStores} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button className="btn btn-outline" onClick={exportStores}>
            <Download size={16} /> Exportar
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              sessionStorage.removeItem('mb_admin_auth');
              window.location.assign('/');
            }}
          >
            <ArrowLeft size={16} /> Sair
          </button>
        </div>
      </header>

      {error && <div className="auth-error">{error}</div>}

      <section className="admin-metrics">
        <article>
          <Building2 size={20} />
          <span>Barracas</span>
          <strong>{totals.stores}</strong>
        </article>
        <article>
          <Users size={20} />
          <span>Funcionarios</span>
          <strong>{totals.employees}</strong>
        </article>
        <article>
          <Utensils size={20} />
          <span>Itens no cardapio</span>
          <strong>{totals.menuItems}</strong>
        </article>
        <article>
          <ShieldCheck size={20} />
          <span>Pedidos ativos</span>
          <strong>{totals.activeOrders}</strong>
        </article>
        <article>
          <Download size={20} />
          <span>Receita fechada</span>
          <strong>{currency(totals.revenue)}</strong>
        </article>
      </section>

      <section className="admin-table-card">
        <div className="admin-table-header">
          <h2>Barracas cadastradas</h2>
          <label className="admin-search">
            <Search size={16} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, codigo, dono..." />
          </label>
        </div>

        <div className="admin-table">
          <div className="admin-table-row head">
            <span>Barraca</span>
            <span>Codigo</span>
            <span>Dono</span>
            <span>Operacao</span>
            <span>Receita</span>
            <span>Acoes</span>
          </div>
          {filteredStores.map(store => (
            <div className="admin-table-row" key={store.id}>
              <span>
                <strong>{store.name}</strong>
                <small>{store.address || 'Sem endereco'}</small>
              </span>
              <span>{store.tenantCode || '-'}</span>
              <span>{store.ownerEmail || '-'}</span>
              <span>
                {store.tablesCount} mesas · {store.employeesCount} equipe · {store.menuItemsCount} itens
              </span>
              <span>{currency(store.totalRevenue)}</span>
              <span className="row-actions">
                <button className="icon-button" onClick={() => setSelectedStore(store)} title="Editar">
                  <Edit3 size={16} />
                </button>
                <button className="icon-button danger" onClick={() => handleDeleteStore(store)} title="Excluir">
                  <Trash2 size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {selectedStore && (
        <div className="modal-overlay">
          <form className="admin-edit-modal" onSubmit={handleSaveStore}>
            <header>
              <div>
                <h2>Editar barraca</h2>
                <p>{selectedStore.id}</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedStore(null)}>
                <X size={18} />
              </button>
            </header>

            <div className="form-grid two">
              <label>
                Nome
                <input value={selectedStore.name} onChange={event => setSelectedStore({ ...selectedStore, name: event.target.value })} />
              </label>
              <label>
                Codigo da barraca
                <input
                  value={selectedStore.tenantCode || ''}
                  onChange={event => setSelectedStore({ ...selectedStore, tenantCode: event.target.value.toUpperCase() })}
                />
              </label>
            </div>

            <div className="form-grid two">
              <label>
                E-mail do dono
                <input
                  type="email"
                  value={selectedStore.ownerEmail || ''}
                  onChange={event => setSelectedStore({ ...selectedStore, ownerEmail: event.target.value })}
                />
              </label>
              <label>
                Telefone
                <input value={selectedStore.phone || ''} onChange={event => setSelectedStore({ ...selectedStore, phone: event.target.value })} />
              </label>
            </div>

            <label>
              Endereco
              <input value={selectedStore.address || ''} onChange={event => setSelectedStore({ ...selectedStore, address: event.target.value })} />
            </label>

            <div className="form-grid three">
              <label>
                Mesas
                <input
                  type="number"
                  min={1}
                  value={selectedStore.tablesCount}
                  onChange={event => setSelectedStore({ ...selectedStore, tablesCount: Number(event.target.value) })}
                />
              </label>
              <label>
                Taxa %
                <input
                  type="number"
                  min={0}
                  value={selectedStore.serviceChargePercent}
                  onChange={event => setSelectedStore({ ...selectedStore, serviceChargePercent: Number(event.target.value) })}
                />
              </label>
              <label>
                Tema
                <select
                  value={selectedStore.themeColor || 'teal'}
                  onChange={event => setSelectedStore({ ...selectedStore, themeColor: event.target.value })}
                >
                  <option value="teal">Teal</option>
                  <option value="coral">Coral</option>
                  <option value="gold">Dourado</option>
                  <option value="emerald">Esmeralda</option>
                </select>
              </label>
            </div>

            <footer>
              <button type="button" className="btn btn-outline" onClick={() => setSelectedStore(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={16} /> Salvar alteracoes
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
};
