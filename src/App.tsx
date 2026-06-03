import { useState, useEffect } from 'react';
import { 
  initializeLocalStorage, 
  getStoreInfo, 
  getMenuItems, 
  getEmployees, 
  getOrders, 
  getSales, 
  saveStoreInfo, 
  saveMenuItems, 
  saveEmployees, 
  saveOrders, 
  saveSales 
} from './mockData';
import { 
  checkSupabase, 
  fetchStoreInfo, 
  updateStoreInfoSupabase, 
  fetchMenuItems, 
  addMenuItemSupabase, 
  deleteMenuItemSupabase, 
  fetchEmployees, 
  addEmployeeSupabase, 
  deleteEmployeeSupabase, 
  fetchOrders, 
  addOrderSupabase, 
  updateOrderSupabase, 
  fetchSalesSupabase 
} from './supabaseService';
import { supabase } from './supabaseClient';
import { StoreInfo, MenuItem, Employee, Order, DailySale } from './types';
import { Login } from './components/Login';
import { DashboardOwner } from './components/DashboardOwner';
import { WaiterPanel } from './components/WaiterPanel';
import { KitchenPanel } from './components/KitchenPanel';
import { CashierPanel } from './components/CashierPanel';
import { Sparkles, RefreshCw, Database } from 'lucide-react';

function App() {
  // Estados principais
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(() => getStoreInfo());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getMenuItems());
  const [employees, setEmployees] = useState<Employee[]>(() => getEmployees());
  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [sales, setSales] = useState<DailySale[]>(() => getSales());

  // Estados de navegação, sessão e SaaS tenant
  const [currentStoreId, setCurrentStoreId] = useState<string>('local');
  const [user, setUser] = useState<Employee | null>(null);
  const [currentRole, setCurrentRole] = useState<'login' | 'owner' | 'waiter' | 'kitchen' | 'cashier'>('login');
  
  // Estado de conexão ativa
  const [dbMode, setDbMode] = useState<'supabase' | 'local'>('local');

  // Auxiliar para carregar dados de uma loja do Supabase sob demanda
  const loadStoreData = async (storeId: string) => {
    try {
      const items = await fetchMenuItems(storeId);
      setMenuItems(items);

      const emps = await fetchEmployees(storeId);
      setEmployees(emps);

      const ords = await fetchOrders(storeId);
      setOrders(ords);

      const sls = await fetchSalesSupabase(storeId);
      setSales(sls);
    } catch (e) {
      console.error('Erro ao carregar dados específicos do Supabase:', e);
    }
  };

  // 1. Carregar dados iniciais e restaurar sessão (Auto-login)
  useEffect(() => {
    const loadSessionAndData = async () => {
      const isSupabaseActive = checkSupabase();
      
      if (isSupabaseActive) {
        setDbMode('supabase');
        
        // Tentar restaurar sessão
        const cachedStoreId = localStorage.getItem('mb_session_store_id');
        const cachedEmpStr = localStorage.getItem('mb_session_employee');
        const cachedStoreInfoStr = localStorage.getItem('mb_session_store_info');
        const cachedRole = localStorage.getItem('mb_session_role');

        if (cachedStoreId && cachedEmpStr && cachedStoreInfoStr && cachedRole) {
          try {
            const sId = cachedStoreId;
            const emp = JSON.parse(cachedEmpStr);
            const sInfo = JSON.parse(cachedStoreInfoStr);
            
            setCurrentStoreId(sId);
            setUser(emp);
            setStoreInfo(sInfo);
            setCurrentRole(cachedRole as any);

            // Puxa dados da loja conectada
            await loadStoreData(sId);
          } catch (err) {
            console.error('Erro ao restaurar sessão cacheada:', err);
            loadLocalFallback();
          }
        }
      } else {
        setDbMode('local');
        loadLocalFallback();
      }
    };

    const loadLocalFallback = () => {
      initializeLocalStorage();
      setStoreInfo(getStoreInfo());
      setMenuItems(getMenuItems());
      setEmployees(getEmployees());
      setOrders(getOrders());
      setSales(getSales());
    };

    loadSessionAndData();
  }, []);

  // 2. Ouvintes em Tempo Real (Supabase Realtime WebSockets)
  useEffect(() => {
    if (dbMode !== 'supabase' || !supabase || currentStoreId === 'local') return;

    console.log(`Registrando canais Supabase Realtime para a loja: ${currentStoreId}`);

    // Canal para Pedidos e Itens
    const ordersChannel = supabase
      .channel(`orders-${currentStoreId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${currentStoreId}` }, 
        async () => {
          console.log('Realtime: Atualização de Pedido recebida.');
          setOrders(await fetchOrders(currentStoreId));
          setSales(await fetchSalesSupabase(currentStoreId));
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'order_items' }, // Escuta geral (filtro local em fetchOrders)
        async () => {
          console.log('Realtime: Atualização de Itens de Pedido recebida.');
          setOrders(await fetchOrders(currentStoreId));
        }
      )
      .subscribe();

    // Canal para Cardápio
    const menuChannel = supabase
      .channel(`menu-${currentStoreId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'menu_items', filter: `store_id=eq.${currentStoreId}` }, 
        async () => {
          console.log('Realtime: Atualização do Cardápio recebida.');
          setMenuItems(await fetchMenuItems(currentStoreId));
        }
      )
      .subscribe();

    // Canal para Funcionários
    const employeesChannel = supabase
      .channel(`employees-${currentStoreId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'employees', filter: `store_id=eq.${currentStoreId}` }, 
        async () => {
          console.log('Realtime: Atualização de Funcionários recebida.');
          setEmployees(await fetchEmployees(currentStoreId));
        }
      )
      .subscribe();

    return () => {
      console.log('Removendo canais Supabase Realtime...');
      supabase?.removeChannel(ordersChannel);
      supabase?.removeChannel(menuChannel);
      supabase?.removeChannel(employeesChannel);
    };
  }, [dbMode, currentStoreId]);

  // 3. Sincronização de abas do LocalStorage (Modo offline)
  useEffect(() => {
    if (dbMode === 'supabase') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mb_orders') setOrders(getOrders());
      if (e.key === 'mb_menu_items') setMenuItems(getMenuItems());
      if (e.key === 'mb_employees') setEmployees(getEmployees());
      if (e.key === 'mb_store_info') setStoreInfo(getStoreInfo());
      if (e.key === 'mb_sales') setSales(getSales());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [dbMode]);

  // Forçar recarga manual
  const forceSync = async () => {
    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      const store = await fetchStoreInfo(currentStoreId);
      if (store) setStoreInfo(store);
      await loadStoreData(currentStoreId);
      console.log('Sincronização manual do Supabase finalizada!');
    } else {
      setStoreInfo(getStoreInfo());
      setMenuItems(getMenuItems());
      setEmployees(getEmployees());
      setOrders(getOrders());
      setSales(getSales());
    }
  };

  // Login com persistência de sessão
  const handleLoginSuccess = (
    employee: Employee, 
    selectedRoleOverride?: 'owner' | 'waiter' | 'kitchen' | 'cashier',
    storeData?: StoreInfo,
    storeId?: string
  ) => {
    const activeStoreId = storeId || 'local';
    const activeStoreInfo = storeData || getStoreInfo();
    const activeRole = selectedRoleOverride || employee.role;

    setCurrentStoreId(activeStoreId);
    setUser(employee);
    setStoreInfo(activeStoreInfo);
    setCurrentRole(activeRole);

    // Salva sessão localmente para persistir recarga de página na Vercel
    localStorage.setItem('mb_session_store_id', activeStoreId);
    localStorage.setItem('mb_session_employee', JSON.stringify(employee));
    localStorage.setItem('mb_session_store_info', JSON.stringify(activeStoreInfo));
    localStorage.setItem('mb_session_role', activeRole);

    // Carregar dados específicos da loja
    if (activeStoreId !== 'local' && dbMode === 'supabase') {
      loadStoreData(activeStoreId);
    }
  };

  // Logout com limpeza da sessão cacheada
  const handleLogout = () => {
    setUser(null);
    setCurrentRole('login');
    setCurrentStoreId('local');
    localStorage.removeItem('mb_session_store_id');
    localStorage.removeItem('mb_session_employee');
    localStorage.removeItem('mb_session_store_info');
    localStorage.removeItem('mb_session_role');
  };

  // Escritas de Dados no Banco / LocalStorage
  const handleUpdateStoreInfo = async (info: StoreInfo) => {
    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      await updateStoreInfoSupabase(currentStoreId, info);
    } else {
      saveStoreInfo(info);
    }
    setStoreInfo(info);
  };

  const handleUpdateMenuItems = async (items: MenuItem[]) => {
    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      if (items.length < menuItems.length) {
        const deletedItem = menuItems.find(mi => !items.some(i => i.id === mi.id));
        if (deletedItem) await deleteMenuItemSupabase(deletedItem.id);
      } else if (items.length > menuItems.length) {
        const newItem = items.find(mi => !menuItems.some(i => i.id === mi.id));
        if (newItem) await addMenuItemSupabase(currentStoreId, newItem);
      }
      setMenuItems(await fetchMenuItems(currentStoreId));
    } else {
      saveMenuItems(items);
      setMenuItems(items);
    }
  };

  const handleUpdateEmployees = async (emps: Employee[]) => {
    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      if (emps.length < employees.length) {
        const deleted = employees.find(e => !emps.some(i => i.id === e.id));
        if (deleted) await deleteEmployeeSupabase(deleted.id);
      } else if (emps.length > employees.length) {
        const added = emps.find(e => !employees.some(i => i.id === e.id));
        if (added) await addEmployeeSupabase(currentStoreId, added);
      }
      setEmployees(await fetchEmployees(currentStoreId));
    } else {
      saveEmployees(emps);
      setEmployees(emps);
    }
  };

  const handleAddOrder = async (order: Order) => {
    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      await addOrderSupabase(currentStoreId, order);
      setOrders(await fetchOrders(currentStoreId));
    } else {
      const updated = [...orders, order];
      saveOrders(updated);
      setOrders(updated);
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      await updateOrderSupabase(currentStoreId, updatedOrder);
      setOrders(await fetchOrders(currentStoreId));
    } else {
      const updated = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      saveOrders(updated);
      setOrders(updated);
    }
  };

  const handleCloseOrder = async (
    orderId: string, 
    paymentMethod: 'pix' | 'card' | 'cash', 
    discount: number, 
    serviceCharge: number, 
    total: number
  ) => {
    const originalOrder = orders.find(o => o.id === orderId);
    if (!originalOrder) return;

    const closedOrder: Order = {
      ...originalOrder,
      status: 'completed',
      paymentMethod,
      discount,
      serviceCharge,
      total,
      completedAt: new Date().toISOString()
    };

    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      await updateOrderSupabase(currentStoreId, closedOrder);
      setOrders(await fetchOrders(currentStoreId));
      setSales(await fetchSalesSupabase(currentStoreId));
    } else {
      const updatedOrders = orders.map(o => o.id === orderId ? closedOrder : o);
      saveOrders(updatedOrders);
      setOrders(updatedOrders);

      const currentSales = getSales();
      const todayStr = new Date().toLocaleDateString('pt-BR');
      const todayIndex = currentSales.findIndex(
        s => new Date(s.date).toLocaleDateString('pt-BR') === todayStr
      );

      if (todayIndex >= 0) {
        currentSales[todayIndex].totalSales += total;
        currentSales[todayIndex].orderCount += 1;
        currentSales[todayIndex].byPaymentMethod[paymentMethod] += total;
      } else {
        currentSales.push({
          id: 'sale_' + Date.now(),
          date: new Date().toISOString(),
          totalSales: total,
          orderCount: 1,
          byPaymentMethod: {
            pix: paymentMethod === 'pix' ? total : 0,
            card: paymentMethod === 'card' ? total : 0,
            cash: paymentMethod === 'cash' ? total : 0
          }
        });
      }

      saveSales(currentSales);
      setSales(currentSales);
    }
  };

  return (
    <div>
      {/* Barra de Simulação do Demo */}
      {currentRole !== 'login' && (
        <div style={{
          backgroundColor: '#0F172A',
          color: '#E2E8F0',
          padding: '0.5rem 1rem',
          fontSize: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          zIndex: 1000,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={14} style={{ color: '#F59E0B' }} />
            <span><strong>Modo de Demonstração:</strong> Alterne de papel para testar o fluxo!</span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: dbMode === 'supabase' ? '#065F46' : '#374151',
              color: dbMode === 'supabase' ? '#34D399' : '#D1D5DB',
              padding: '2px 8px',
              borderRadius: '50px',
              fontSize: '0.65rem',
              fontWeight: 700,
              marginLeft: '10px'
            }}>
              <Database size={10} /> {dbMode === 'supabase' ? 'Supabase SaaS' : 'LocalStorage Offline'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => setCurrentRole('owner')}
              style={{
                backgroundColor: currentRole === 'owner' ? '#0EA5E9' : '#334155',
                color: 'white',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              👑 Dono (Admin)
            </button>
            <button 
              onClick={() => setCurrentRole('waiter')}
              style={{
                backgroundColor: currentRole === 'waiter' ? '#0EA5E9' : '#334155',
                color: 'white',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🙋‍♂️ Garçom
            </button>
            <button 
              onClick={() => setCurrentRole('kitchen')}
              style={{
                backgroundColor: currentRole === 'kitchen' ? '#0EA5E9' : '#334155',
                color: 'white',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🍳 Cozinha
            </button>
            <button 
              onClick={() => setCurrentRole('cashier')}
              style={{
                backgroundColor: currentRole === 'cashier' ? '#0EA5E9' : '#334155',
                color: 'white',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              💰 Caixa
            </button>
            
            <button 
              onClick={forceSync} 
              title="Forçar Sincronização"
              style={{
                backgroundColor: '#1E293B',
                color: '#94A3B8',
                border: 'none',
                padding: '3px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Renderização Condicional de Telas */}
      {currentRole === 'login' && (
        <Login 
          employees={employees} 
          onLoginSuccess={handleLoginSuccess} 
          storeName={storeInfo.name} 
        />
      )}

      {currentRole === 'owner' && (
        <DashboardOwner 
          storeInfo={storeInfo}
          onUpdateStoreInfo={handleUpdateStoreInfo}
          menuItems={menuItems}
          onUpdateMenuItems={handleUpdateMenuItems}
          employees={employees}
          onUpdateEmployees={handleUpdateEmployees}
          sales={sales}
          onLogout={handleLogout}
        />
      )}

      {currentRole === 'waiter' && user && (
        <WaiterPanel 
          waiter={user}
          menuItems={menuItems}
          orders={orders}
          onAddOrder={handleAddOrder}
          onUpdateOrder={handleUpdateOrder}
          tablesCount={storeInfo.tablesCount}
          onLogout={handleLogout}
        />
      )}

      {currentRole === 'kitchen' && user && (
        <KitchenPanel 
          kitchenUser={user}
          orders={orders}
          menuItems={menuItems}
          onUpdateOrder={handleUpdateOrder}
          onLogout={handleLogout}
        />
      )}

      {currentRole === 'cashier' && user && (
        <CashierPanel 
          cashierUser={user}
          storeInfo={storeInfo}
          orders={orders}
          onUpdateOrder={handleUpdateOrder}
          onCloseOrder={handleCloseOrder}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
