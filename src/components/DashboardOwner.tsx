import React, { useState } from 'react';
import { StoreInfo, MenuItem, Employee, DailySale, Order } from '../types';
import { 
  Store, Utensils, Users, TrendingUp, Plus, Trash2, 
  Save, DollarSign, ShoppingBag, Percent, LogOut, ShieldAlert,
  Award, BarChart2, Hash, X
} from 'lucide-react';

interface DashboardOwnerProps {
  storeInfo: StoreInfo;
  onUpdateStoreInfo: (info: StoreInfo) => void;
  menuItems: MenuItem[];
  onUpdateMenuItems: (items: MenuItem[]) => void;
  employees: Employee[];
  onUpdateEmployees: (employees: Employee[]) => void;
  sales: DailySale[];
  orders: Order[];
  onLogout: () => void;
}

type TabType = 'overview' | 'menu' | 'employees' | 'settings';

const isDrinkCategory = (category: string) => {
  const normalized = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return ['bebida', 'drink', 'cerveja', 'suco', 'refrigerante', 'agua', 'caipirinha', 'vinho', 'destilado']
    .some(keyword => normalized.includes(keyword));
};

export const DashboardOwner: React.FC<DashboardOwnerProps> = ({
  storeInfo,
  onUpdateStoreInfo,
  menuItems,
  onUpdateMenuItems,
  employees,
  onUpdateEmployees,
  sales,
  orders,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Estados locais da Loja
  const [storeName, setStoreName] = useState(storeInfo.name);
  const [storeLogo, setStoreLogo] = useState(storeInfo.logoUrl || '🏖️');
  const [storeAddress, setStoreAddress] = useState(storeInfo.address || '');
  const [storePhone, setStorePhone] = useState(storeInfo.phone || '');
  const [storeTables, setStoreTables] = useState(storeInfo.tablesCount);
  const [storeServiceCharge, setStoreServiceCharge] = useState(storeInfo.serviceChargePercent);

  // Novos estados para Tema e Categorias
  const [storeThemeColor, setStoreThemeColor] = useState(storeInfo.themeColor || 'teal');
  const [storeCategories, setStoreCategories] = useState<string[]>(storeInfo.categories || ['Bebidas', 'Petiscos', 'Sobremesas']);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Sincronizar estados com props quando mudarem
  React.useEffect(() => {
    setStoreName(storeInfo.name);
    setStoreLogo(storeInfo.logoUrl || '🏖️');
    setStoreAddress(storeInfo.address || '');
    setStorePhone(storeInfo.phone || '');
    setStoreTables(storeInfo.tablesCount);
    setStoreServiceCharge(storeInfo.serviceChargePercent);
    setStoreThemeColor(storeInfo.themeColor || 'teal');
    setStoreCategories(storeInfo.categories || ['Bebidas', 'Petiscos', 'Sobremesas']);
  }, [storeInfo]);

  // Estados para Item do Cardápio
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Petiscos');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemEmoji, setNewItemEmoji] = useState('🍔');

  // Estados para Funcionário
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<'waiter' | 'kitchen' | 'cashier'>('waiter');
  const [newEmpPin, setNewEmpPin] = useState('');

  // Salvar configurações da loja
  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStoreInfo({
      name: storeName,
      logoUrl: storeLogo,
      address: storeAddress,
      phone: storePhone,
      tablesCount: Number(storeTables),
      serviceChargePercent: Number(storeServiceCharge),
      tenantCode: storeInfo.tenantCode, // Mantém o código do inquilino
      themeColor: storeThemeColor,
      categories: storeCategories
    });
    alert('Configurações da barraca salvas com sucesso! 🏖️');
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (storeCategories.includes(trimmed)) {
      alert('Esta categoria já existe!');
      return;
    }
    setStoreCategories([...storeCategories, trimmed]);
    setNewCategoryInput('');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const hasItems = menuItems.some(item => item.category === catToDelete);
    if (hasItems) {
      if (!confirm(`Atenção: Existem itens no cardápio na categoria "${catToDelete}". Se você remover a categoria, esses itens continuarão no cardápio mas a categoria não estará listada como ativa. Deseja continuar?`)) {
        return;
      }
    }
    setStoreCategories(storeCategories.filter(c => c !== catToDelete));
  };

  // Excluir item
  const handleDeleteMenuItem = (id: string) => {
    if (confirm('Tem certeza que deseja remover este item do cardápio?')) {
      const updated = menuItems.filter(item => item.id !== id);
      onUpdateMenuItems(updated);
    }
  };

  // Adicionar item
  const handleAddMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const newItem: MenuItem = {
      id: 'm_' + Date.now(),
      name: newItemName,
      price: Number(newItemPrice),
      description: newItemDesc,
      category: newItemCategory,
      imageUrl: newItemEmoji,
      isAvailable: true,
      isPromotion: false
    };

    onUpdateMenuItems([...menuItems, newItem]);
    setShowMenuModal(false);
    
    setNewItemName('');
    setNewItemPrice('');
    setNewItemDesc('');
    setNewItemEmoji('🍔');
  };

  // Excluir funcionário
  const handleDeleteEmployee = (id: string) => {
    if (id === 'e1') {
      alert('Você não pode excluir o Dono administrativo!');
      return;
    }
    if (confirm('Deseja demitir/remover este funcionário?')) {
      const updated = employees.filter(emp => emp.id !== id);
      onUpdateEmployees(updated);
    }
  };

  // Adicionar funcionário
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || newEmpPin.length !== 4) {
      alert('Preencha o nome e um PIN numérico de 4 dígitos.');
      return;
    }

    if (employees.some(emp => emp.pin === newEmpPin)) {
      alert('Este PIN já está sendo usado. Escolha outro.');
      return;
    }

    const newEmp: Employee = {
      id: 'e_' + Date.now(),
      name: newEmpName,
      role: newEmpRole,
      pin: newEmpPin
    };

    onUpdateEmployees([...employees, newEmp]);
    setShowEmployeeModal(false);

    setNewEmpName('');
    setNewEmpPin('');
    setNewEmpRole('waiter');
  };

  // Métricas do Painel Financeiro
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalSales, 0);
  const totalOrdersCount = sales.reduce((acc, sale) => acc + sale.orderCount, 0);
  const averageTicket = totalOrdersCount > 0 ? (totalRevenue / totalOrdersCount) : 0;

  // Totalizadores por método de pagamento
  const paymentTotals = sales.reduce(
    (acc, sale) => {
      acc.pix += sale.byPaymentMethod.pix;
      acc.card += sale.byPaymentMethod.card;
      acc.cash += sale.byPaymentMethod.cash;
      return acc;
    },
    { pix: 0, card: 0, cash: 0 }
  );

  // 1. Cômputo: Vendas por Categoria (Comidas vs Bebidas) de forma 100% dinâmica
  const getCategorySalesRatio = () => {
    let foodSales = 0;
    let drinkSales = 0;

    orders.forEach(order => {
      if (order.status === 'completed') {
        order.items.forEach(item => {
          const menuItem = menuItems.find(m => m.id === item.menuItemId || m.name === item.name);
          const category = menuItem?.category || 'Petiscos';
          const value = item.price * item.quantity;
          if (isDrinkCategory(category)) {
            drinkSales += value;
          } else {
            foodSales += value;
          }
        });
      }
    });

    const total = foodSales + drinkSales;
    if (total === 0) return { food: 60, drink: 40 }; // Fallback padrão equilibrado
    return {
      food: Math.round((foodSales / total) * 100),
      drink: Math.round((drinkSales / total) * 100)
    };
  };

  const { food: ratioFood, drink: ratioDrink } = getCategorySalesRatio();

  // 2. Cômputo: Ranking de Garçons (Leaderboard) de forma 100% dinâmica
  const getWaiterPerformance = () => {
    const stats: Record<string, { name: string; total: number; count: number }> = {};
    
    // Inicializa estatísticas para todos os funcionários cadastrados que são garçons (para que apareçam no ranking mesmo com zero vendas)
    employees.forEach(emp => {
      if (emp.role === 'waiter') {
        stats[emp.name] = { name: emp.name, total: 0, count: 0 };
      }
    });

    // Soma as vendas reais dos garçons de pedidos concluídos
    orders.forEach(order => {
      if (order.status === 'completed' && order.waiterName) {
        const name = order.waiterName;
        if (!stats[name]) {
          stats[name] = { name, total: 0, count: 0 };
        }
        stats[name].total += order.total;
        stats[name].count += 1;
      }
    });

    const sortedStats = Object.values(stats).sort((a, b) => b.total - a.total);
    
    // Se não houver vendas reais de garçons, injeta estatísticas fictícias de teste para a tela não ficar vazia no onboarding
    if (sortedStats.length === 0 || sortedStats.every(s => s.total === 0)) {
      return [
        { name: 'Carlos Santos (Exemplo)', total: 320.00, count: 6 },
        { name: 'Mariana Souza (Exemplo)', total: 450.00, count: 8 }
      ].sort((a, b) => b.total - a.total);
    }

    return sortedStats;
  };

  const waiterLeaderboard = getWaiterPerformance();

  return (
    <div className="app-container">
      {/* Brand Header */}
      <header className="brand-header">
        <div className="brand-logo">
          <div className="brand-logo-icon">{storeLogo}</div>
          <span>{storeInfo.name}</span>
          <span style={{
            fontSize: '0.8rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '50px',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            marginLeft: '0.5rem'
          }}>Painel Administrativo</span>
        </div>

        {/* Exibição do Código da Barraca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {storeInfo.tenantCode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary-dark)',
              padding: '0.4rem 1rem',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 750,
              border: '1px dashed var(--primary)'
            }}>
              <Hash size={14} />
              <span>Código da Barraca: <strong style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>{storeInfo.tenantCode}</strong></span>
            </div>
          )}

          <button onClick={onLogout} className="btn btn-outline" style={{ gap: '0.5rem' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-menu">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <TrendingUp size={20} /> Visão Geral
            </button>
            <button 
              onClick={() => setActiveTab('menu')} 
              className={`sidebar-item ${activeTab === 'menu' ? 'active' : ''}`}
            >
              <Utensils size={20} /> Cardápio ({menuItems.length})
            </button>
            <button 
              onClick={() => setActiveTab('employees')} 
              className={`sidebar-item ${activeTab === 'employees' ? 'active' : ''}`}
            >
              <Users size={20} /> Equipe / PINs ({employees.length})
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <Store size={20} /> Dados da Barraca
            </button>
          </div>
          <div className="sidebar-footer" style={{
            fontSize: '0.75rem',
            color: 'var(--text-light)',
            textAlign: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem'
          }}>
            Maestria Beach v1.1.0 SaaS
          </div>
        </aside>

        {/* Content Area */}
        <main className="content-area">
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: 800 }}>Métricas Gerais do Quiosque</h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
                  <div className="flex-between" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>Faturamento Total</span>
                    <DollarSign size={20} style={{ color: 'var(--success)' }} />
                  </div>
                  <h3 style={{ fontSize: '2rem', fontWeight: 800 }}>R$ {totalRevenue.toFixed(2)}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Soma acumulada de caixas</span>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                  <div className="flex-between" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>Pedidos Fechados</span>
                    <ShoppingBag size={20} style={{ color: 'var(--primary)' }} />
                  </div>
                  <h3 style={{ fontSize: '2rem', fontWeight: 800 }}>{totalOrdersCount}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Mesas atendidas hoje</span>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
                  <div className="flex-between" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>Ticket Médio</span>
                    <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 style={{ fontSize: '2rem', fontWeight: 800 }}>R$ {averageTicket.toFixed(2)}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Média gasta por mesa</span>
                </div>
              </div>

              {/* Seção Gráfica e Ranking */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem'
              }}>
                
                {/* Métricas e Faturamento Categoria */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart2 size={18} style={{ color: 'var(--primary)' }} /> Vendas por Categoria
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Gráfico Linear Proporcional */}
                    <div>
                      <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span>🍔 Pratos & Petiscos ({ratioFood}%)</span>
                        <span>🍹 Bebidas & Drinks ({ratioDrink}%)</span>
                      </div>
                      <div style={{ height: '16px', background: '#e2e8f0', borderRadius: '50px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${ratioFood}%`, height: '100%', background: 'linear-gradient(95deg, var(--secondary), #f97316)' }} title="Pratos e Petiscos" />
                        <div style={{ width: `${ratioDrink}%`, height: '100%', background: 'linear-gradient(95deg, var(--primary), var(--primary-dark))' }} title="Bebidas" />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Faturamento por Método de Pagamento</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        <div>
                          <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                            <span>Pix ⚡</span>
                            <strong>R$ {paymentTotals.pix.toFixed(2)}</strong>
                          </div>
                          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                            <div style={{ height: '100%', background: 'var(--primary)', borderRadius: '3px', width: `${totalRevenue > 0 ? (paymentTotals.pix / totalRevenue) * 100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                            <span>Cartão 💳</span>
                            <strong>R$ {paymentTotals.card.toFixed(2)}</strong>
                          </div>
                          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                            <div style={{ height: '100%', background: 'var(--secondary)', borderRadius: '3px', width: `${totalRevenue > 0 ? (paymentTotals.card / totalRevenue) * 100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                            <span>Dinheiro 💵</span>
                            <strong>R$ {paymentTotals.cash.toFixed(2)}</strong>
                          </div>
                          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px' }}>
                            <div style={{ height: '100%', background: 'var(--accent)', borderRadius: '3px', width: `${totalRevenue > 0 ? (paymentTotals.cash / totalRevenue) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leaderboard/Ranking do Staff */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={18} style={{ color: 'var(--accent)' }} /> Ranking de Garçons (Equipe)
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {waiterLeaderboard.map((waiterStat, index) => (
                      <div 
                        key={waiterStat.name} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.25rem' }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{waiterStat.name}</strong>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{waiterStat.count} atendimentos concluídos</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--success)' }}>
                            R$ {waiterStat.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CARDÁPIO */}
          {activeTab === 'menu' && (
            <div>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Gestão de Cardápio</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Adicione, remova e altere os preços cobrados nas mesas.</p>
                </div>
                <button onClick={() => setShowMenuModal(true)} className="btn btn-primary" style={{ borderRadius: '12px' }}>
                  <Plus size={18} /> Adicionar Item
                </button>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Foto/Emoji</th>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>Descrição</th>
                      <th>Preço</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem', fontSize: '1.75rem' }}>{item.imageUrl}</td>
                        <td style={{ fontWeight: 700 }}>{item.name}</td>
                        <td>
                          <span className={`badge ${item.category === 'Bebidas' ? 'badge-info' : 'badge-warning'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '260px' }}>
                          {item.description || 'Sem descrição.'}
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '1rem' }}>R$ {item.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDeleteMenuItem(item.id)} 
                            className="btn btn-ghost" 
                            style={{ color: 'var(--danger)', padding: '0.5rem' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EQUIPE / PINS */}
          {activeTab === 'employees' && (
            <div>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Minha Equipe</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cadastre garçons, cozinheiros e caixas. Cada um terá um PIN exclusivo de acesso.</p>
                </div>
                <button onClick={() => setShowEmployeeModal(true)} className="btn btn-primary" style={{ borderRadius: '12px' }}>
                  <Plus size={18} /> Adicionar Funcionário
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.5rem'
              }}>
                {employees.map(emp => (
                  <div key={emp.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="flex-between">
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{emp.name}</strong>
                      <span className={`badge ${
                        emp.role === 'waiter' ? 'badge-info' : emp.role === 'kitchen' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {emp.role === 'waiter' ? 'Garçom' : emp.role === 'kitchen' ? 'Cozinha' : 'Caixa'}
                      </span>
                    </div>

                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>PIN de Acesso:</span>
                      <strong style={{ fontSize: '1.05rem', letterSpacing: '2px', color: 'var(--primary-dark)' }}>{emp.pin}</strong>
                    </div>

                    <div className="flex-between" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.6rem', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>ID: {emp.id.substr(0, 8)}</span>
                      {emp.id !== 'e1' && (
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)} 
                          className="btn btn-ghost" 
                          style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem', fontSize: '0.75rem', gap: '4px' }}
                        >
                          <Trash2 size={13} /> Remover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURAÇÕES BARRACA */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>Dados Comerciais</h2>
              
              <form onSubmit={handleSaveStore} className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nome Comercial</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={storeName} 
                      onChange={e => setStoreName(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Emoji / Logotipo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={storeLogo} 
                      onChange={e => setStoreLogo(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Endereço da Praia/Quiosque</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={storeAddress} 
                    onChange={e => setStoreAddress(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={storePhone} 
                      onChange={e => setStorePhone(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total de Mesas / Guarda-sóis</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      min="1" 
                      max="100" 
                      value={storeTables} 
                      onChange={e => setStoreTables(Number(e.target.value))} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Taxa de Serviço (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      min="0" 
                      max="30" 
                      value={storeServiceCharge} 
                      onChange={e => setStoreServiceCharge(Number(e.target.value))} 
                      required 
                    />
                    <Percent size={18} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Personalização Visual (Tema) */}
                <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🎨 Identidade Visual / Tema
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Selecione um tema de luxo ou escolha sua própria cor de destaque personalizada abaixo.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {[
                      { id: 'teal', name: 'Royal Teal', color: '#0F6A80' },
                      { id: 'coral', name: 'Sunset Coral', color: '#E76F51' },
                      { id: 'gold', name: 'Sand Gold', color: '#BFA15F' },
                      { id: 'emerald', name: 'Sea Emerald', color: '#0D9488' }
                    ].map(theme => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setStoreThemeColor(theme.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '0.6rem 1rem',
                          borderRadius: '12px',
                          border: '2px solid',
                          borderColor: storeThemeColor === theme.id ? 'var(--primary)' : 'var(--border-color)',
                          backgroundColor: storeThemeColor === theme.id ? 'var(--primary-light)' : 'white',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          fontWeight: 650,
                          fontSize: '0.85rem',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <span style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: theme.color,
                          display: 'inline-block',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }} />
                        {theme.name}
                      </button>
                    ))}
                  </div>

                  {/* Seletor de Cor Customizada */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: '#f8fafc',
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    width: 'fit-content'
                  }}>
                    <input 
                      type="color" 
                      id="customColorPicker"
                      value={storeThemeColor.startsWith('#') ? storeThemeColor : '#0F6A80'}
                      onChange={e => setStoreThemeColor(e.target.value)}
                      style={{
                        width: '40px',
                        height: '40px',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: 0,
                        backgroundColor: 'transparent'
                      }}
                    />
                    <div>
                      <label htmlFor="customColorPicker" style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', cursor: 'pointer' }}>
                        Cor Personalizada
                      </label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {storeThemeColor.startsWith('#') ? storeThemeColor.toUpperCase() : 'Nenhuma selecionada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Categorias do Cardápio */}
                <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏷️ Categorias do Cardápio
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Personalize as divisões do seu cardápio (ex: Bebidas, Petiscos, Sobremesas).
                  </p>
                  
                  {/* Lista de Categorias Atuais */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {storeCategories.map(cat => (
                      <div
                        key={cat}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary-dark)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '10px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: '1px solid rgba(15, 106, 128, 0.1)'
                        }}
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 0
                          }}
                          title="Remover Categoria"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Formulário para Adicionar Categoria */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Nova categoria (Ex: Coquetéis, Porções)"
                      className="form-control"
                      style={{ flexGrow: 1, padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="btn btn-outline"
                      style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', flexShrink: 0 }}
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', borderRadius: '12px' }}>
                  <Save size={18} /> Salvar Dados Comerciais
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: NOVO ITEM CARDÁPIO */}
      {showMenuModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: '20px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Adicionar Item ao Cardápio</h3>
              <button onClick={() => setShowMenuModal(false)} className="btn btn-ghost" style={{ fontSize: '1.2rem' }}>×</button>
            </div>
            <form onSubmit={handleAddMenuItem}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Emoji</label>
                    <select className="form-control" value={newItemEmoji} onChange={e => setNewItemEmoji(e.target.value)}>
                      <option value="🍺">🍺 Cerveja</option>
                      <option value="🍹">🍹 Caipirinha</option>
                      <option value="🥥">🥥 Coco</option>
                      <option value="🥤">🥤 Suco</option>
                      <option value="🐟">🐟 Peixe</option>
                      <option value="🍤">🍤 Camarão</option>
                      <option value="🥟">🥟 Pastel</option>
                      <option value="🍟">🍟 Fritas</option>
                      <option value="🍖">🍖 Carne</option>
                      <option value="🍔">🍔 Hambúrguer</option>
                      <option value="🍧">🍧 Sorvete</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Nome</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ex: Pastel de Camarão" 
                      value={newItemName} 
                      onChange={e => setNewItemName(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select className="form-control" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}>
                      {(storeInfo.categories || ['Bebidas', 'Petiscos', 'Sobremesas']).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preço (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      placeholder="0.00" 
                      value={newItemPrice} 
                      onChange={e => setNewItemPrice(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea 
                    className="form-control" 
                    rows={2} 
                    placeholder="Ex: Porção com 6 unidades, acompanha limão..." 
                    value={newItemDesc} 
                    onChange={e => setNewItemDesc(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowMenuModal(false)} className="btn btn-outline" style={{ borderRadius: '10px' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '10px' }}>Cadastrar Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO FUNCIONÁRIO */}
      {showEmployeeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderRadius: '20px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Novo Colaborador</h3>
              <button onClick={() => setShowEmployeeModal(false)} className="btn btn-ghost" style={{ fontSize: '1.2rem' }}>×</button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome do Funcionário</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: João Silva" 
                    value={newEmpName} 
                    onChange={e => setNewEmpName(e.target.value)} 
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Cargo / Função</label>
                    <select className="form-control" value={newEmpRole} onChange={e => setNewEmpRole(e.target.value as any)}>
                      <option value="waiter">Garçom (Lançamentos celular)</option>
                      <option value="kitchen">Cozinha / Bar (Preparo)</option>
                      <option value="cashier">Caixa / Fechamento</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">PIN de 4 dígitos</label>
                    <input 
                      type="text" 
                      maxLength={4} 
                      className="form-control" 
                      placeholder="Ex: 5678" 
                      value={newEmpPin} 
                      onChange={e => setNewEmpPin(e.target.value.replace(/\D/g, ''))} 
                      required 
                    />
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: 'var(--primary-light)',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '0.75rem',
                  color: 'var(--primary-dark)',
                  fontWeight: 500
                }}>
                  <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Com o Código da sua Barraca e o PIN cadastrado acima, seu funcionário terá acesso imediato de qualquer smartphone sem precisar de e-mail.
                  </span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="btn btn-outline" style={{ borderRadius: '10px' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '10px' }}>Salvar Funcionário</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
