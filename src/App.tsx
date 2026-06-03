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

  // Estados de navegação e sessão
  const [user, setUser] = useState<Employee | null>(null);
  const [currentRole, setCurrentRole] = useState<'login' | 'owner' | 'waiter' | 'kitchen' | 'cashier'>('login');
  
  // Estado para indicar qual conexão está ativa
  const [dbMode, setDbMode] = useState<'supabase' | 'local'>('local');

  // 1. Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      const isSupabaseActive = checkSupabase();
      
      if (isSupabaseActive) {
        setDbMode('supabase');
        try {
          console.log('Carregando dados iniciais do Supabase...');
          const store = await fetchStoreInfo();
          if (store) setStoreInfo(store);

          const items = await fetchMenuItems();
          if (items.length > 0) setMenuItems(items);

          const emps = await fetchEmployees();
          if (emps.length > 0) setEmployees(emps);

          const ords = await fetchOrders();
          setOrders(ords);

          const sls = await fetchSalesSupabase();
          setSales(sls);
        } catch (e) {
          console.error('Erro de conexão ao carregar Supabase. Utilizando fallback LocalStorage.', e);
          setDbMode('local');
          loadLocalFallback();
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

    loadInitialData();
  }, []);

  // 2. Ouvintes em Tempo Real (Supabase Realtime WebSockets)
  useEffect(() => {
    if (dbMode !== 'supabase' || !supabase) return;

    console.log('Registrando canais Supabase Realtime para sincronização automática...');

    // Canal para Pedidos e Itens
    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        console.log('Realtime: Mudança nos Pedidos detectada.');
        const ords = await fetchOrders();
        setOrders(ords);
        const sls = await fetchSalesSupabase();
        setSales(sls);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, async () => {
        console.log('Realtime: Mudança nos Itens de Pedido detectada.');
        const ords = await fetchOrders();
        setOrders(ords);
      })
      .subscribe();

    // Canal para Cardápio
    const menuChannel = supabase
      .channel('menu-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, async () => {
        console.log('Realtime: Mudança no Cardápio detectada.');
        const items = await fetchMenuItems();
        setMenuItems(items);
      })
      .subscribe();

    // Canal para Funcionários
    const employeesChannel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, async () => {
        console.log('Realtime: Mudança nos Funcionários detectada.');
        const emps = await fetchEmployees();
        setEmployees(emps);
      })
      .subscribe();

    return () => {
      console.log('Removendo canais Supabase Realtime...');
      supabase?.removeChannel(ordersChannel);
      supabase?.removeChannel(menuChannel);
      supabase?.removeChannel(employeesChannel);
    };
  }, [dbMode]);

  // 3. Sincronização entre abas (LocalStorage fallback)
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
    if (dbMode === 'supabase') {
      const store = await fetchStoreInfo();
      if (store) setStoreInfo(store);
      setMenuItems(await fetchMenuItems());
      setEmployees(await fetchEmployees());
      setOrders(await fetchOrders());
      setSales(await fetchSalesSupabase());
      console.log('Sincronização forçada com o Supabase efetuada!');
    } else {
      setStoreInfo(getStoreInfo());
      setMenuItems(getMenuItems());
      setEmployees(getEmployees());
      setOrders(getOrders());
      setSales(getSales());
    }
  };

  // Autenticação
  const handleLoginSuccess = (employee: Employee, selectedRoleOverride?: 'owner' | 'waiter' | 'kitchen' | 'cashier') => {
    setUser(employee);
    if (selectedRoleOverride) {
      setCurrentRole(selectedRoleOverride);
    } else {
      setCurrentRole(employee.role);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentRole('login');
  };

  // Ações de Alteração de Dados
  const handleUpdateStoreInfo = async (info: StoreInfo) => {
    if (dbMode === 'supabase') {
      await updateStoreInfoSupabase(info);
    } else {
      saveStoreInfo(info);
    }
    setStoreInfo(info);
  };

  const handleUpdateMenuItems = async (items: MenuItem[]) => {
    if (dbMode === 'supabase') {
      if (items.length < menuItems.length) {
        // Exclusão
        const deletedItem = menuItems.find(mi => !items.some(i => i.id === mi.id));
        if (deletedItem) await deleteMenuItemSupabase(deletedItem.id);
      } else if (items.length > menuItems.length) {
        // Inserção
        const newItem = items.find(mi => !menuItems.some(i => i.id === mi.id));
        if (newItem) await addMenuItemSupabase(newItem);
      }
      setMenuItems(await fetchMenuItems());
    } else {
      saveMenuItems(items);
      setMenuItems(items);
    }
  };

  const handleUpdateEmployees = async (emps: Employee[]) => {
    if (dbMode === 'supabase') {
      if (emps.length < employees.length) {
        // Exclusão
        const deleted = employees.find(e => !emps.some(i => i.id === e.id));
        if (deleted) await deleteEmployeeSupabase(deleted.id);
      } else if (emps.length > employees.length) {
        // Inserção
        const added = emps.find(e => !employees.some(i => i.id === e.id));
        if (added) await addEmployeeSupabase(added);
      }
      setEmployees(await fetchEmployees());
    } else {
      saveEmployees(emps);
      setEmployees(emps);
    }
  };

  const handleAddOrder = async (order: Order) => {
    if (dbMode === 'supabase') {
      await addOrderSupabase(order);
      setOrders(await fetchOrders());
    } else {
      const updated = [...orders, order];
      saveOrders(updated);
      setOrders(updated);
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    if (dbMode === 'supabase') {
      await updateOrderSupabase(updatedOrder);
      setOrders(await fetchOrders());
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

    if (dbMode === 'supabase') {
      const closedOrder: Order = {
        ...originalOrder,
        status: 'completed',
        paymentMethod,
        discount,
        serviceCharge,
        total,
        completedAt: new Date().toISOString()
      };
      
      await updateOrderSupabase(closedOrder);
      setOrders(await fetchOrders());
      setSales(await fetchSalesSupabase());
    } else {
      const closedOrder: Order = {
        ...originalOrder,
        status: 'completed',
        paymentMethod,
        discount,
        serviceCharge,
        total,
        completedAt: new Date().toISOString()
      };

      const updatedOrders = orders.map(o => o.id === orderId ? closedOrder : o);
      saveOrders(updatedOrders);
      setOrders(updatedOrders);

      // Registrar vendas diárias locais
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
      {/* Barra de Simulação */}
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
              <Database size={10} /> {dbMode === 'supabase' ? 'Supabase Realtime' : 'LocalStorage Offline'}
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
