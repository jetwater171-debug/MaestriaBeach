import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
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
  ReceiptText,
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

type BillingStatus = NonNullable<AdminStoreSummary['subscriptionStatus']>;

type BillingRecord = {
  planName: string;
  monthlyFee: number;
  subscriptionStatus: BillingStatus;
  subscriptionDueDate: string;
  amountPaid: number;
  lastPaymentAt?: string;
  adminIncident?: string;
};

const BILLING_STORAGE_KEY = 'mb_admin_billing_records';

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

const dateInputValue = (date?: string) => {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

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

const readBillingRecords = (): Record<string, BillingRecord> => {
  try {
    return JSON.parse(localStorage.getItem(BILLING_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeBillingRecords = (records: Record<string, BillingRecord>) => {
  localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(records));
};

const defaultBillingForStore = (store: AdminStoreSummary): BillingRecord => {
  const createdAt = store.createdAt ? new Date(store.createdAt) : new Date();
  return {
    planName: store.invitePending ? 'Convite' : 'Profissional',
    monthlyFee: store.invitePending ? 0 : 197,
    subscriptionStatus: store.invitePending ? 'trial' : 'active',
    subscriptionDueDate: addDays(createdAt, 30).toISOString(),
    amountPaid: 0,
    lastPaymentAt: undefined,
    adminIncident: ''
  };
};

const daysUntil = (date?: string) => {
  if (!date) return 999;
  const due = new Date(date);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
};

const statusLabel: Record<BillingStatus, string> = {
  trial: 'Teste',
  active: 'Ativo',
  overdue: 'Vencido',
  paused: 'Pausado',
  canceled: 'Cancelado'
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
  const [billingRecords, setBillingRecords] = useState<Record<string, BillingRecord>>(() => readBillingRecords());

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
    const enriched = stores.map(store => ({
      ...store,
      ...(billingRecords[store.id] || defaultBillingForStore(store))
    }));

    if (!term) return enriched;

    return enriched.filter(store =>
      [store.name, store.tenantCode, store.ownerEmail, store.address, store.planName, store.subscriptionStatus]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    );
  }, [stores, search, billingRecords]);

  const enrichedStores = useMemo(() => {
    return stores.map(store => ({
      ...store,
      ...(billingRecords[store.id] || defaultBillingForStore(store))
    }));
  }, [stores, billingRecords]);

  const totals = useMemo(() => {
    return enrichedStores.reduce(
      (acc, store) => ({
        stores: acc.stores + 1,
        employees: acc.employees + store.employeesCount,
        menuItems: acc.menuItems + store.menuItemsCount,
        activeOrders: acc.activeOrders + store.activeOrdersCount,
        completedOrders: acc.completedOrders + store.completedOrdersCount,
        pendingInvites: acc.pendingInvites + (store.invitePending ? 1 : 0),
        mrr: acc.mrr + (store.subscriptionStatus === 'active' ? Number(store.monthlyFee || 0) : 0),
        overdue: acc.overdue + (store.subscriptionStatus === 'overdue' || daysUntil(store.subscriptionDueDate) < 0 ? 1 : 0),
        dueSoon: acc.dueSoon + (daysUntil(store.subscriptionDueDate) >= 0 && daysUntil(store.subscriptionDueDate) <= 7 ? 1 : 0),
        paidToUs: acc.paidToUs + Number(store.amountPaid || 0),
        revenue: acc.revenue + store.totalRevenue
      }),
      {
        stores: 0,
        employees: 0,
        menuItems: 0,
        activeOrders: 0,
        completedOrders: 0,
        pendingInvites: 0,
        mrr: 0,
        overdue: 0,
        dueSoon: 0,
        paidToUs: 0,
        revenue: 0
      }
    );
  }, [enrichedStores]);

  const storeRankings = useMemo(() => {
    const withOrderCount = enrichedStores.map(store => ({
      ...store,
      totalOrdersCount: store.activeOrdersCount + store.completedOrdersCount
    }));

    return {
      byOrders: [...withOrderCount].sort((a, b) => b.totalOrdersCount - a.totalOrdersCount).slice(0, 5),
      byRevenue: [...withOrderCount].sort((a, b) => Number(b.amountPaid || 0) - Number(a.amountPaid || 0)).slice(0, 5),
      needsAttention: withOrderCount
        .filter(store =>
          store.invitePending ||
          store.subscriptionStatus === 'overdue' ||
          daysUntil(store.subscriptionDueDate) < 0 ||
          Boolean(store.adminIncident) ||
          store.employeesCount === 0 ||
          store.menuItemsCount === 0
        )
        .sort((a, b) =>
          Number(b.subscriptionStatus === 'overdue') - Number(a.subscriptionStatus === 'overdue') ||
          Number(Boolean(b.adminIncident)) - Number(Boolean(a.adminIncident)) ||
          Number(b.invitePending) - Number(a.invitePending)
        )
        .slice(0, 5)
    };
  }, [enrichedStores]);

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

    const payload: StoreInfo & Partial<AdminStoreSummary> = {
      name: selectedStore.name,
      logoUrl: selectedStore.logoUrl,
      address: selectedStore.address,
      phone: selectedStore.phone,
      tablesCount: Number(selectedStore.tablesCount),
      serviceChargePercent: Number(selectedStore.serviceChargePercent),
      tenantCode: selectedStore.tenantCode,
      themeColor: selectedStore.themeColor,
      categories: selectedStore.categories,
      ownerEmail: selectedStore.ownerEmail,
      planName: selectedStore.planName,
      monthlyFee: selectedStore.monthlyFee,
      subscriptionStatus: selectedStore.subscriptionStatus,
      subscriptionDueDate: selectedStore.subscriptionDueDate,
      amountPaid: selectedStore.amountPaid,
      lastPaymentAt: selectedStore.lastPaymentAt,
      adminIncident: selectedStore.adminIncident
    };

    setLoading(true);
    try {
      const nextBillingRecords = {
        ...billingRecords,
        [selectedStore.id]: {
          planName: selectedStore.planName || 'Profissional',
          monthlyFee: Number(selectedStore.monthlyFee || 0),
          subscriptionStatus: selectedStore.subscriptionStatus || 'active',
          subscriptionDueDate: selectedStore.subscriptionDueDate || addDays(new Date(), 30).toISOString(),
          amountPaid: Number(selectedStore.amountPaid || 0),
          lastPaymentAt: selectedStore.lastPaymentAt,
          adminIncident: selectedStore.adminIncident || ''
        }
      };
      writeBillingRecords(nextBillingRecords);
      setBillingRecords(nextBillingRecords);

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
      const nextBillingRecords = { ...billingRecords };
      delete nextBillingRecords[store.id];
      writeBillingRecords(nextBillingRecords);
      setBillingRecords(nextBillingRecords);
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
        setSelectedDetails({
          ...details,
          store: {
            ...details.store,
            ...(billingRecords[details.store.id] || defaultBillingForStore(details.store))
          }
        });
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
          <span>Assinantes</span>
          <strong>{totals.stores}</strong>
          <small>{totals.pendingInvites} convite(s) pendente(s)</small>
        </article>
        <article>
          <ReceiptText size={20} />
          <span>MRR previsto</span>
          <strong>{currency(totals.mrr)}</strong>
          <small>mensalidades ativas</small>
        </article>
        <article>
          <AlertTriangle size={20} />
          <span>Vencidos</span>
          <strong>{totals.overdue}</strong>
          <small>{totals.dueSoon} vencendo em 7 dias</small>
        </article>
        <article>
          <Activity size={20} />
          <span>Operando</span>
          <strong>{stores.filter(store => !store.invitePending).length}</strong>
          <small>{stores.filter(store => store.activeOrdersCount > 0).length} com pedidos ativos</small>
        </article>
        <article>
          <BarChart3 size={20} />
          <span>Recebido por voce</span>
          <strong>{currency(totals.paidToUs)}</strong>
          <small>controle comercial interno</small>
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
            <span><BarChart3 size={16} /> Mais pagaram</span>
            <small>Receita do Maestria, nao da barraca</small>
          </div>
          <div className="admin-ranking-list compact">
            {storeRankings.byRevenue.map((store, index) => (
              <button key={store.id} type="button" onClick={() => loadStoreDetails(store)}>
                <b>{index + 1}</b>
                <span>
                  <strong>{store.name}</strong>
                  <small>{store.planName} - {statusLabel[(store.subscriptionStatus || 'trial') as BillingStatus]}</small>
                </span>
                <em>{currency(Number(store.amountPaid || 0))}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="admin-rank-panel attention">
          <div className="admin-panel-heading">
            <span><ShieldCheck size={16} /> Risco e erros</span>
            <small>Vencidos, incidentes ou setup incompleto</small>
          </div>
          <div className="admin-ranking-list compact">
            {storeRankings.needsAttention.length === 0 ? (
              <p className="admin-empty-state">Tudo sob controle agora.</p>
            ) : storeRankings.needsAttention.map(store => (
              <button key={store.id} type="button" onClick={() => loadStoreDetails(store)}>
                <b>{store.invitePending ? '!' : store.activeOrdersCount}</b>
                <span>
                  <strong>{store.name}</strong>
                  <small>
                    {store.adminIncident || (daysUntil(store.subscriptionDueDate) < 0 ? 'Assinatura vencida' : store.invitePending ? 'Convite ainda nao ativado' : 'Setup incompleto')}
                  </small>
                </span>
                <em>{statusLabel[(store.subscriptionStatus || 'trial') as BillingStatus]}</em>
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
            <span>Assinatura</span>
            <span>Vencimento</span>
            <span>Uso</span>
            <span>Pago a voce</span>
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
                <strong>{store.planName || 'Sem plano'}</strong>
                <small className={`billing-status ${(store.subscriptionStatus || 'trial')}`}>
                  {statusLabel[(store.subscriptionStatus || 'trial') as BillingStatus]} - {currency(Number(store.monthlyFee || 0))}/mes
                </small>
              </span>
              <span>
                <strong>{store.subscriptionDueDate ? new Date(store.subscriptionDueDate).toLocaleDateString('pt-BR') : '-'}</strong>
                <small>{daysUntil(store.subscriptionDueDate) < 0 ? `${Math.abs(daysUntil(store.subscriptionDueDate))} dia(s) atrasado` : `${daysUntil(store.subscriptionDueDate)} dia(s) restantes`}</small>
              </span>
              <span className="admin-order-pill">
                <strong>{store.completedOrdersCount + store.activeOrdersCount}</strong>
                <small>{store.activeOrdersCount} ativos - {store.menuItemsCount} itens</small>
              </span>
              <span>
                <strong>{currency(Number(store.amountPaid || 0))}</strong>
                <small>{store.lastPaymentAt ? `ultimo ${new Date(store.lastPaymentAt).toLocaleDateString('pt-BR')}` : 'sem pagamento registrado'}</small>
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
                <ReceiptText size={17} />
                <span>Mensalidade</span>
                <strong>{currency(Number(selectedDetails.store.monthlyFee || 0))}</strong>
              </article>
              <article>
                <BarChart3 size={17} />
                <span>Total pago</span>
                <strong>{currency(Number(selectedDetails.store.amountPaid || 0))}</strong>
              </article>
              <article>
                <AlertTriangle size={17} />
                <span>Status SaaS</span>
                <strong>{statusLabel[(selectedDetails.store.subscriptionStatus || 'trial') as BillingStatus]}</strong>
              </article>
              <article>
                <CalendarDays size={17} />
                <span>Vencimento</span>
                <strong>{selectedDetails.store.subscriptionDueDate ? new Date(selectedDetails.store.subscriptionDueDate).toLocaleDateString('pt-BR') : 'Sem data'}</strong>
              </article>
            </div>
          )}

          <div className="admin-health-strip">
            <span>
              <strong>Saude operacional</strong>
              {selectedDetails.store.adminIncident || 'Nenhum erro manual registrado para esta barraca.'}
            </span>
            <span>
              <strong>Uso da barraca</strong>
              {selectedDetailsStats?.completed || 0} pedidos fechados - ticket medio {currency(selectedDetailsStats?.averageTicket || 0)}
            </span>
            <span>
              <strong>Ultimo pedido</strong>
              {formatDateTime(selectedDetailsStats?.lastOrder)}
            </span>
          </div>

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

            <div className="admin-billing-editor">
              <h3>Assinatura do cliente</h3>
              <div className="form-grid three">
                <label>
                  Plano
                  <input
                    value={selectedStore.planName || ''}
                    onChange={event => setSelectedStore({ ...selectedStore, planName: event.target.value })}
                    placeholder="Profissional"
                  />
                </label>
                <label>
                  Mensalidade (R$)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selectedStore.monthlyFee ?? 0}
                    onChange={event => setSelectedStore({ ...selectedStore, monthlyFee: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={selectedStore.subscriptionStatus || 'trial'}
                    onChange={event => setSelectedStore({ ...selectedStore, subscriptionStatus: event.target.value as BillingStatus })}
                  >
                    <option value="trial">Teste</option>
                    <option value="active">Ativo</option>
                    <option value="overdue">Vencido</option>
                    <option value="paused">Pausado</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </label>
              </div>

              <div className="form-grid three">
                <label>
                  Vencimento
                  <input
                    type="date"
                    value={dateInputValue(selectedStore.subscriptionDueDate)}
                    onChange={event => setSelectedStore({ ...selectedStore, subscriptionDueDate: new Date(`${event.target.value}T12:00:00`).toISOString() })}
                  />
                </label>
                <label>
                  Total ja pago (R$)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selectedStore.amountPaid ?? 0}
                    onChange={event => setSelectedStore({ ...selectedStore, amountPaid: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Ultimo pagamento
                  <input
                    type="date"
                    value={dateInputValue(selectedStore.lastPaymentAt)}
                    onChange={event => setSelectedStore({ ...selectedStore, lastPaymentAt: new Date(`${event.target.value}T12:00:00`).toISOString() })}
                  />
                </label>
              </div>

              <label>
                Erro/incidente desta barraca
                <textarea
                  value={selectedStore.adminIncident || ''}
                  onChange={event => setSelectedStore({ ...selectedStore, adminIncident: event.target.value })}
                  placeholder="Ex: dono relatou falha no Wi-Fi, cardapio incompleto, pagamento em atraso..."
                  rows={3}
                />
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
