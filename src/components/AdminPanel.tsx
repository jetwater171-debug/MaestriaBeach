import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  Eye,
  KeyRound,
  Link2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trophy,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { AdminStoreSummary, StoreInfo } from '../types';
import { getEmployees, getMenuItems, getOrders, getStoreInfo, saveStoreInfo } from '../mockData';

type AdminStoreDetails = {
  store: AdminStoreSummary;
  employees: Array<{ id: string; name: string; role: string; pin: string }>;
  menuItems: Array<{ id: string; name: string; category: string; price: number; is_available?: boolean }>;
  orders: Array<{ id: string; table_number: number; status: string; total: number; created_at: string; order_items?: unknown[] }>;
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

const formatDateTime = (date?: string) => {
  if (!date) return 'Sem data';
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

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
  const [inviteClientName, setInviteClientName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');

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
        completedOrders: acc.completedOrders + store.completedOrdersCount,
        pendingInvites: acc.pendingInvites + (store.invitePending ? 1 : 0),
        revenue: acc.revenue + store.totalRevenue
      }),
      { stores: 0, employees: 0, menuItems: 0, activeOrders: 0, completedOrders: 0, pendingInvites: 0, revenue: 0 }
    );
  }, [stores]);

  const storeRankings = useMemo(() => {
    const withOrderCount = stores.map(store => ({
      ...store,
      totalOrdersCount: store.activeOrdersCount + store.completedOrdersCount
    }));

    return {
      byOrders: [...withOrderCount].sort((a, b) => b.totalOrdersCount - a.totalOrdersCount).slice(0, 5),
      byRevenue: [...withOrderCount].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5),
      needsAttention: withOrderCount
        .filter(store => store.invitePending || store.activeOrdersCount > 0 || store.employeesCount === 0 || store.menuItemsCount === 0)
        .sort((a, b) => Number(b.invitePending) - Number(a.invitePending) || b.activeOrdersCount - a.activeOrdersCount)
        .slice(0, 5)
    };
  }, [stores]);

  const selectedDetailsStats = useMemo(() => {
    if (!selectedDetails) return null;
    const completed = selectedDetails.orders.filter(order => order.status === 'completed');
    const active = selectedDetails.orders.filter(order => order.status === 'active');
    const revenue = completed.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const averageTicket = completed.length > 0 ? revenue / completed.length : 0;

    return {
      active: active.length,
      completed: completed.length,
      revenue,
      averageTicket,
      lastOrder: selectedDetails.orders[0]?.created_at
    };
  }, [selectedDetails]);

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

  const handleCreateInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await adminRequest<{ inviteUrl: string }>('/api/admin-stores', password, {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_invite',
          clientName: inviteClientName,
          phone: invitePhone
        })
      });

      setGeneratedInviteUrl(data.inviteUrl);
      setInviteClientName('');
      setInvitePhone('');
      await loadStores();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Nao foi possivel gerar o convite.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteUrl = async () => {
    if (!generatedInviteUrl) return;
    await navigator.clipboard?.writeText(generatedInviteUrl);
    alert('Link de convite copiado.');
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
          <span className="section-eyebrow">Command center Maestria</span>
          <h1>Painel administrativo</h1>
          <p>Controle total das barracas, convites, operacao, receita e crescimento da rede.</p>
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
          <small>{totals.pendingInvites} convite(s) pendente(s)</small>
        </article>
        <article>
          <ClipboardList size={20} />
          <span>Pedidos totais</span>
          <strong>{totals.completedOrders + totals.activeOrders}</strong>
          <small>{totals.activeOrders} ativo(s) agora</small>
        </article>
        <article>
          <Users size={20} />
          <span>Equipe cadastrada</span>
          <strong>{totals.employees}</strong>
          <small>{totals.menuItems} itens nos cardapios</small>
        </article>
        <article>
          <Activity size={20} />
          <span>Barracas operando</span>
          <strong>{stores.filter(store => !store.invitePending).length}</strong>
          <small>{stores.filter(store => store.activeOrdersCount > 0).length} com pedidos ativos</small>
        </article>
        <article>
          <BarChart3 size={20} />
          <span>Receita fechada</span>
          <strong>{currency(totals.revenue)}</strong>
          <small>{totals.completedOrders} pedido(s) fechado(s)</small>
        </article>
      </section>

      <section className="admin-command-grid">
        <article className="admin-rank-panel featured">
          <div className="admin-panel-heading">
            <span><Trophy size={16} /> Mais pedidos</span>
            <small>Ranking por pedidos ativos + fechados</small>
          </div>
          <div className="admin-ranking-list">
            {storeRankings.byOrders.map((store, index) => (
              <button key={store.id} type="button" onClick={() => loadStoreDetails(store)}>
                <b>{index + 1}</b>
                <span>
                  <strong>{store.name}</strong>
                  <small>{store.activeOrdersCount + store.completedOrdersCount} pedidos - {store.activeOrdersCount} ativos</small>
                </span>
                <em>{store.tenantCode || 'sem codigo'}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="admin-rank-panel">
          <div className="admin-panel-heading">
            <span><BarChart3 size={16} /> Maior receita</span>
            <small>Barracas com mais faturamento fechado</small>
          </div>
          <div className="admin-ranking-list compact">
            {storeRankings.byRevenue.map((store, index) => (
              <button key={store.id} type="button" onClick={() => loadStoreDetails(store)}>
                <b>{index + 1}</b>
                <span>
                  <strong>{store.name}</strong>
                  <small>{store.completedOrdersCount} pedidos fechados</small>
                </span>
                <em>{currency(store.totalRevenue)}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="admin-rank-panel attention">
          <div className="admin-panel-heading">
            <span><ShieldCheck size={16} /> Precisa atencao</span>
            <small>Convites, cardapio vazio ou operacao ativa</small>
          </div>
          <div className="admin-ranking-list compact">
            {storeRankings.needsAttention.length === 0 ? (
              <p className="admin-empty-state">Tudo sob controle agora.</p>
            ) : storeRankings.needsAttention.map(store => (
              <button key={store.id} type="button" onClick={() => loadStoreDetails(store)}>
                <b>{store.invitePending ? '!' : store.activeOrdersCount}</b>
                <span>
                  <strong>{store.name}</strong>
                  <small>{store.invitePending ? 'Convite ainda nao ativado' : `${store.activeOrdersCount} pedidos ativos`}</small>
                </span>
                <em>{store.menuItemsCount} itens</em>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-invite-card">
        <div>
          <span className="section-eyebrow">Onboarding controlado</span>
          <h2>Criar link unico para nova barraca</h2>
          <p>
            Gere um link exclusivo para enviar ao dono. Ele abre uma tela de boas-vindas,
            configura a barraca e o link deixa de funcionar depois da ativacao.
          </p>
        </div>

        <form onSubmit={handleCreateInvite} className="admin-invite-form">
          <label>
            Nome do cliente ou barraca
            <input
              value={inviteClientName}
              onChange={event => setInviteClientName(event.target.value)}
              placeholder="Ex: Quiosque Mar Azul"
            />
          </label>
          <label>
            Telefone opcional
            <input
              value={invitePhone}
              onChange={event => setInvitePhone(event.target.value)}
              placeholder="WhatsApp do dono"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <Link2 size={16} /> Gerar link unico
          </button>
        </form>

        {generatedInviteUrl && (
          <div className="admin-invite-result">
            <input readOnly value={generatedInviteUrl} onFocus={event => event.currentTarget.select()} />
            <button className="btn btn-outline" type="button" onClick={copyInviteUrl}>
              <Copy size={16} /> Copiar link
            </button>
          </div>
        )}
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
            <span>Pedidos</span>
            <span>Receita</span>
            <span>Acoes</span>
          </div>
          {filteredStores.map(store => (
            <div className={`admin-table-row ${store.invitePending ? 'pending' : ''}`} key={store.id}>
              <span className="admin-store-cell">
                <i>{store.logoUrl || 'MB'}</i>
                <span>
                  <strong>{store.name}</strong>
                  <small>{store.invitePending ? 'Convite pendente de ativacao' : store.address || 'Sem endereco'}</small>
                </span>
              </span>
              <span>
                <strong>{store.tenantCode || '-'}</strong>
                <small>{store.tablesCount} mesa(s)</small>
              </span>
              <span>
                <strong>{store.ownerEmail || '-'}</strong>
                <small>{store.phone || 'sem telefone'}</small>
              </span>
              <span className="admin-order-pill">
                <strong>{store.completedOrdersCount + store.activeOrdersCount}</strong>
                <small>{store.activeOrdersCount} ativos - {store.completedOrdersCount} fechados</small>
              </span>
              <span>
                <strong>{currency(store.totalRevenue)}</strong>
                <small>{store.employeesCount} equipe - {store.menuItemsCount} itens</small>
              </span>
              <span className="row-actions">
                <button className="icon-button" onClick={() => loadStoreDetails(store)} title="Ver detalhes">
                  <Eye size={16} />
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
              <p>{selectedDetails.store.tenantCode} - {selectedDetails.store.ownerEmail || 'Sem e-mail'} - {selectedDetails.store.address || 'Sem endereco'}</p>
            </div>
            <div className="row-actions">
              <button className="btn btn-outline" type="button" onClick={() => setSelectedStore(selectedDetails.store)}>
                <Edit3 size={16} /> Editar
              </button>
              <button className="icon-button" onClick={() => setSelectedDetails(null)}>
                <X size={18} />
              </button>
            </div>
          </header>

          {selectedDetailsStats && (
            <div className="admin-detail-metrics">
              <article>
                <ClipboardList size={17} />
                <span>Pedidos ativos</span>
                <strong>{selectedDetailsStats.active}</strong>
              </article>
              <article>
                <ShieldCheck size={17} />
                <span>Pedidos fechados</span>
                <strong>{selectedDetailsStats.completed}</strong>
              </article>
              <article>
                <BarChart3 size={17} />
                <span>Receita</span>
                <strong>{currency(selectedDetailsStats.revenue)}</strong>
              </article>
              <article>
                <Activity size={17} />
                <span>Ticket medio</span>
                <strong>{currency(selectedDetailsStats.averageTicket)}</strong>
              </article>
              <article>
                <CalendarDays size={17} />
                <span>Ultimo pedido</span>
                <strong>{formatDateTime(selectedDetailsStats.lastOrder)}</strong>
              </article>
            </div>
          )}

          <div className="admin-details-grid">
            <article>
              <h3>Equipe</h3>
              {selectedDetails.employees.length === 0 ? <span>Nenhum funcionario cadastrado.</span> : selectedDetails.employees.slice(0, 8).map(employee => (
                <span key={employee.id}>{employee.name} - {employee.role} - PIN {employee.pin}</span>
              ))}
            </article>
            <article>
              <h3>Cardapio</h3>
              {selectedDetails.menuItems.length === 0 ? <span>Nenhum item cadastrado.</span> : selectedDetails.menuItems.slice(0, 10).map(item => (
                <span key={item.id}>{item.name} - {item.category} - {currency(Number(item.price))}</span>
              ))}
            </article>
            <article>
              <h3>Pedidos recentes</h3>
              {selectedDetails.orders.length === 0 ? <span>Nenhum pedido registrado.</span> : selectedDetails.orders.slice(0, 10).map(order => (
                <span key={order.id}>Mesa {order.table_number} - {order.status} - {currency(Number(order.total))} - {formatDateTime(order.created_at)}</span>
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
