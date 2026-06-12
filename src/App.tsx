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
  loginEmployee,
  updateStoreInfoSupabase, 
  fetchMenuItems, 
  addMenuItemSupabase, 
  updateMenuItemSupabase,
  deleteMenuItemSupabase, 
  fetchEmployees, 
  addEmployeeSupabase, 
  updateEmployeeSupabase,
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
import { AdminPanel } from './components/AdminPanel';

const hexToRgb = (hex: string): string => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

const adjustColorBrightness = (hex: string, percent: number): string => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  let R = parseInt(hex.substring(0, 2), 16);
  let G = parseInt(hex.substring(2, 4), 16);
  let B = parseInt(hex.substring(4, 6), 16);

  if (percent > 0) {
    R = Math.min(255, Math.max(0, Math.round(R + (255 - R) * (percent / 100))));
    G = Math.min(255, Math.max(0, Math.round(G + (255 - G) * (percent / 100))));
    B = Math.min(255, Math.max(0, Math.round(B + (255 - B) * (percent / 100))));
  } else {
    const factor = (100 + percent) / 100;
    R = Math.round(R * factor);
    G = Math.round(G * factor);
    B = Math.round(B * factor);
  }

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

function MainApp() {
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
      // Sempre inicializa o LocalStorage com os dados mockados de demonstração
      initializeLocalStorage();
      
      const isSupabaseActive = checkSupabase();
      
      // Tentar restaurar sessão
      const cachedStoreId = localStorage.getItem('mb_session_store_id');
      const cachedEmpStr = localStorage.getItem('mb_session_employee');
      const cachedStoreInfoStr = localStorage.getItem('mb_session_store_info');
      const cachedRole = localStorage.getItem('mb_session_role');
      const params = new URLSearchParams(window.location.search);
      const autoLoginStore = params.get('store') || params.get('tenant');
      const autoLoginPin = params.get('pin');
      const shouldAutoLogin = params.get('autologin') === '1' && autoLoginStore && autoLoginPin;

      if (isSupabaseActive) {
        setDbMode('supabase');

        if (shouldAutoLogin) {
          const result = await loginEmployee(autoLoginStore, autoLoginPin);
          if (result) {
            setCurrentStoreId(result.storeId);
            setUser(result.employee);
            setStoreInfo(result.store);
            setCurrentRole(result.employee.role);
            localStorage.setItem('mb_session_store_id', result.storeId);
            localStorage.setItem('mb_session_employee', JSON.stringify(result.employee));
            localStorage.setItem('mb_session_store_info', JSON.stringify(result.store));
            localStorage.setItem('mb_session_role', result.employee.role);
            await loadStoreData(result.storeId);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }
        
        if (cachedStoreId && cachedEmpStr && cachedStoreInfoStr && cachedRole) {
          try {
            const sId = cachedStoreId;
            const emp = JSON.parse(cachedEmpStr);
            const sInfo = JSON.parse(cachedStoreInfoStr);
            
            setCurrentStoreId(sId);
            setUser(emp);
            setStoreInfo(sInfo);
            setCurrentRole(cachedRole as 'owner' | 'waiter' | 'kitchen' | 'cashier');

            // Puxa dados da loja conectada
            await loadStoreData(sId);
          } catch (err) {
            console.error('Erro ao restaurar sessão cacheada do Supabase:', err);
            loadLocalFallback();
          }
        } else {
          // Se não houver sessão ativa do Supabase, preenche os funcionários locais 
          // para que o guia rápido e o fallback local na tela de login funcionem na hora
          setEmployees(getEmployees());
          setStoreInfo(getStoreInfo());
        }
      } else {
        setDbMode('local');
        loadLocalFallback();

        if (shouldAutoLogin) {
          const localStoreInfo = getStoreInfo();
          const normalizedStore = autoLoginStore.toUpperCase().trim();
          const localEmployee = getEmployees().find(employee => employee.pin === autoLoginPin);
          const storeMatches = normalizedStore === 'MAES01' || normalizedStore === localStoreInfo.tenantCode?.toUpperCase();

          if (localEmployee && storeMatches) {
            setCurrentStoreId('local');
            setUser(localEmployee);
            setStoreInfo(localStoreInfo);
            setCurrentRole(localEmployee.role);
            localStorage.setItem('mb_session_store_id', 'local');
            localStorage.setItem('mb_session_employee', JSON.stringify(localEmployee));
            localStorage.setItem('mb_session_store_info', JSON.stringify(localStoreInfo));
            localStorage.setItem('mb_session_role', localEmployee.role);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }

        if (cachedStoreId && cachedEmpStr && cachedStoreInfoStr && cachedRole) {
          try {
            const sId = cachedStoreId;
            const emp = JSON.parse(cachedEmpStr);
            const sInfo = JSON.parse(cachedStoreInfoStr);
            
            setCurrentStoreId(sId);
            setUser(emp);
            setStoreInfo(sInfo);
            setCurrentRole(cachedRole as 'owner' | 'waiter' | 'kitchen' | 'cashier');
          } catch (err) {
            console.error('Erro ao restaurar sessão cacheada local:', err);
          }
        }
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

  // 4. Polling periódico de backup para garantir sincronização entre dispositivos
  useEffect(() => {
    if (dbMode !== 'supabase' || currentStoreId === 'local' || currentRole === 'login') return;

    const interval = setInterval(() => {
      loadStoreData(currentStoreId);
    }, 5000); // Executa a cada 5 segundos

    return () => clearInterval(interval);
  }, [dbMode, currentStoreId, currentRole]);

  // Forçar recarga manual
  const _forceSync = async () => {
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
      const previousById = new Map(menuItems.map(item => [item.id, item]));
      const nextIds = new Set(items.map(item => item.id));

      for (const item of items) {
        const previous = previousById.get(item.id);
        if (!previous) {
          await addMenuItemSupabase(currentStoreId, item);
          continue;
        }

        const changed = JSON.stringify(previous) !== JSON.stringify(item);
        if (changed) {
          await updateMenuItemSupabase(currentStoreId, item);
        }
      }

      for (const previous of menuItems) {
        if (!nextIds.has(previous.id)) {
          await deleteMenuItemSupabase(previous.id);
        }
      }

      setMenuItems(await fetchMenuItems(currentStoreId));
    } else {
      saveMenuItems(items);
      setMenuItems(items);
    }
  };

  const handleUpdateEmployees = async (emps: Employee[]) => {
    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      const previousById = new Map(employees.map(employee => [employee.id, employee]));
      const nextIds = new Set(emps.map(employee => employee.id));

      for (const employee of emps) {
        const previous = previousById.get(employee.id);
        if (!previous) {
          await addEmployeeSupabase(currentStoreId, employee);
          continue;
        }

        const changed = JSON.stringify(previous) !== JSON.stringify(employee);
        if (changed) {
          await updateEmployeeSupabase(currentStoreId, employee);
        }
      }

      for (const previous of employees) {
        if (!nextIds.has(previous.id)) {
          await deleteEmployeeSupabase(previous.id);
        }
      }

      setEmployees(await fetchEmployees(currentStoreId));
    } else {
      saveEmployees(emps);
      setEmployees(emps);
    }
  };

  const handleAddOrder = async (order: Order) => {
    // Adiciona otimisticamente ao estado local para resposta instantânea
    setOrders(prev => [...prev, order]);

    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      const success = await addOrderSupabase(currentStoreId, order);
      if (success) {
        const dbOrders = await fetchOrders(currentStoreId);
        setOrders(dbOrders);
      } else {
        // Remove em caso de erro
        setOrders(prev => prev.filter(o => o.id !== order.id));
        alert('Erro ao registrar o pedido no servidor. Por favor, tente novamente.');
      }
    } else {
      const updated = [...orders, order];
      saveOrders(updated);
      setOrders(updated);
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    // Atualização otimista local
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

    if (dbMode === 'supabase' && currentStoreId !== 'local') {
      const success = await updateOrderSupabase(currentStoreId, updatedOrder);
      if (success) {
        const dbOrders = await fetchOrders(currentStoreId);
        setOrders(dbOrders);
      } else {
        alert('Erro ao atualizar o pedido no servidor. Por favor, tente novamente.');
      }
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

  const isHexColor = storeInfo.themeColor?.startsWith('#');
  const themeClass = isHexColor ? 'theme-custom' : `theme-${storeInfo.themeColor || 'teal'}`;

  return (
    <div className={themeClass}>
      {isHexColor && (
        <style dangerouslySetInnerHTML={{ __html: `
          .theme-custom {
            --primary: ${storeInfo.themeColor};
            --primary-rgb: ${hexToRgb(storeInfo.themeColor!)};
            --primary-dark: ${adjustColorBrightness(storeInfo.themeColor!, -15)};
            --primary-light: ${adjustColorBrightness(storeInfo.themeColor!, 85)};
            --border-focus: ${storeInfo.themeColor};
          }
        `}} />
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
          orders={orders}
          onLogout={handleLogout}
        />
      )}

      {currentRole === 'waiter' && user && (
        <WaiterPanel 
          waiter={user}
          storeInfo={storeInfo}
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

function App() {
  return window.location.pathname === '/admin' ? <AdminPanel /> : <MainApp />;
}

export default App;
