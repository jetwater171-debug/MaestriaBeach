import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Store,
  Trash2,
  Users,
  Utensils,
  X
} from 'lucide-react';
import { AdminStoreSummary, StoreInfo } from '../types';
import { getEmployees, getMenuItems, getOrders, getStoreInfo, saveStoreInfo } from '../mockData';

type AdminStoreDetails = {
  store: AdminStoreSummary;
  employees: Array<{ id: string; name: string; role: string; pin: string }>;
  menuItems: Array<{ id: string; name: string; category: string; price: number; is_available?: boolean }>;
  orders: Array<{ id: string; table_number: number; status: string; total: number; created_at: string }>;
};

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

const adminRequest = async <T,>(
  path: string,
  password: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Erro na API admin.');
  }

  return data as T;
};

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('mb_admin_auth') === 'true');
  const [password, setPassword] = useState(() => sessionStorage.getItem('mb_admin_password') || '');
  const [stores, setStores] = useState<AdminStoreSummary[]>([]);
  const [selectedStore, setSelectedStore] = useState<AdminStoreSummary | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<AdminStoreDetails | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await adminRequest<{ stores: AdminStoreSummary[] }>('/api/admin-stores', password);
      setStores(data.stores);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar as barracas.');
      setStores(window.location.hostname === 'localhost' ? [buildLocalAdminStore()] : []);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStores();
    }
  }, [isAuthenticated, loadStores]);

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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.trim().length < 8) {
      setError('Digite a senha admin configurada na Vercel.');
      return;
    }

    setLoading(true);
    try {
      const data = await adminRequest<{ stores: AdminStoreSummary[] }>('/api/admin-stores', password);
      setStores(data.stores);
      sessionStorage.setItem('mb_admin_auth', 'true');
      sessionStorage.setItem('mb_admin_password', password);
      setIsAuthenticated(true);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Senha admin incorreta.');
    } finally {
      setLoading(false);
    }
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
    try {
      if (selectedStore.id === 'local') {
        saveStoreInfo(payload);
      } else {
        await adminRequest(`/api/admin-stores?id=${encodeURIComponent(selectedStore.id)}`, password, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      }
      setSelectedStore(null);
      await loadStores();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar a barraca.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (store: AdminStoreSummary) => {
    const typedName = prompt(`Exclusao definitiva: digite exatamente "${store.name}" para apagar a barraca e todos os dados vinculados.`);
    if (typedName !== store.name) {
      setError('Exclusao cancelada: o nome digitado nao confere.');
      return;
    }

    setLoading(true);
    try {
      if (store.id === 'local') {
        ['mb_store_info', 'mb_menu_items', 'mb_employees', 'mb_orders', 'mb_sales'].forEach(key => localStorage.removeItem(key));
      } else {
        await adminRequest(`/api/admin-stores?id=${encodeURIComponent(store.id)}`, password, {
          method: 'DELETE'
        });
      }
      setSelectedStore(null);
      setSelectedDetails(null);
      await loadStores();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Nao foi possivel excluir a barraca.');
    } finally {
      setLoading(false);
    }
  };

  const loadStoreDetails = async (store: AdminStoreSummary) => {
    setError('');
    setLoading(true);

    try {
      if (store.id === 'local') {
        setSelectedDetails({
          store,
          employees: getEmployees(),
          menuItems: getMenuItems().map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            is_available: item.isAvailable
          })),
          orders: getOrders().map(order => ({
            id: order.id,
            table_number: order.tableNumber,
            status: order.status,
            total: order.total,
            created_at: order.createdAt
          }))
        });
      } else {
        const details = await adminRequest<AdminStoreDetails>(
          `/api/admin-stores?id=${encodeURIComponent(store.id)}`,
          password
        );
        setSelectedDetails(details);
      }
    } catch (detailsError) {
      setError(detailsError instanceof Error ? detailsError.message : 'Nao foi possivel carregar detalhes.');
    } finally {
      setLoading(false);
    }
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
              sessionStorage.removeItem('mb_admin_password');
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
                <button className="icon-button" onClick={() => loadStoreDetails(store)} title="Ver detalhes">
                  <Store size={16} />
                </button>
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

      {selectedDetails && (
        <section className="admin-details-card">
          <header>
            <div>
              <h2>{selectedDetails.store.name}</h2>
              <p>{selectedDetails.store.tenantCode} · {selectedDetails.store.ownerEmail || 'Sem e-mail'}</p>
            </div>
            <button className="icon-button" onClick={() => setSelectedDetails(null)}>
              <X size={18} />
            </button>
          </header>

          <div className="admin-details-grid">
            <article>
              <h3>Equipe</h3>
              {selectedDetails.employees.slice(0, 8).map(employee => (
                <span key={employee.id}>{employee.name} · {employee.role} · PIN {employee.pin}</span>
              ))}
            </article>
            <article>
              <h3>Cardapio</h3>
              {selectedDetails.menuItems.slice(0, 10).map(item => (
                <span key={item.id}>{item.name} · {item.category} · {currency(Number(item.price))}</span>
              ))}
            </article>
            <article>
              <h3>Pedidos recentes</h3>
              {selectedDetails.orders.slice(0, 10).map(order => (
                <span key={order.id}>Mesa {order.table_number} · {order.status} · {currency(Number(order.total))}</span>
              ))}
            </article>
          </div>
        </section>
      )}

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
