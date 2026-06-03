import React, { useState } from 'react';
import { StoreInfo, MenuItem, Employee, DailySale } from '../types';
import { 
  Store, Utensils, Users, TrendingUp, Plus, Trash2, 
  Save, DollarSign, ShoppingBag, Percent, LogOut, ShieldAlert 
} from 'lucide-react';

interface DashboardOwnerProps {
  storeInfo: StoreInfo;
  onUpdateStoreInfo: (info: StoreInfo) => void;
  menuItems: MenuItem[];
  onUpdateMenuItems: (items: MenuItem[]) => void;
  employees: Employee[];
  onUpdateEmployees: (employees: Employee[]) => void;
  sales: DailySale[];
  onLogout: () => void;
}

type TabType = 'overview' | 'menu' | 'employees' | 'settings';

export const DashboardOwner: React.FC<DashboardOwnerProps> = ({
  storeInfo,
  onUpdateStoreInfo,
  menuItems,
  onUpdateMenuItems,
  employees,
  onUpdateEmployees,
  sales,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Estados locais para edição da Loja
  const [storeName, setStoreName] = useState(storeInfo.name);
  const [storeLogo, setStoreLogo] = useState(storeInfo.logoUrl || '🏖️');
  const [storeAddress, setStoreAddress] = useState(storeInfo.address || '');
  const [storePhone, setStorePhone] = useState(storeInfo.phone || '');
  const [storeTables, setStoreTables] = useState(storeInfo.tablesCount);
  const [storeServiceCharge, setStoreServiceCharge] = useState(storeInfo.serviceChargePercent);

  // Estados locais para adicionar Item no Cardápio
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Petiscos');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemEmoji, setNewItemEmoji] = useState('🍔');

  // Estados locais para adicionar Funcionário
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
      serviceChargePercent: Number(storeServiceCharge)
    });
    alert('Configurações da barraca salvas com sucesso! 🏖️');
  };

  // Excluir item do cardápio
  const handleDeleteMenuItem = (id: string) => {
    if (confirm('Tem certeza que deseja remover este item do cardápio?')) {
      const updated = menuItems.filter(item => item.id !== id);
      onUpdateMenuItems(updated);
    }
  };

  // Adicionar item ao cardápio
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
    
    // Limpar campos
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

    // Verificar se o PIN já existe
    if (employees.some(emp => emp.pin === newEmpPin)) {
      alert('Este PIN já está sendo usado por outro funcionário. Escolha outro.');
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

    // Limpar campos
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
          }}>Painel do Dono</span>
        </div>
        <button onClick={onLogout} className="btn btn-outline" style={{ gap: '0.5rem' }}>
          <LogOut size={16} /> Sair
        </button>
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
              <Users size={20} /> Funcionários ({employees.length})
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <Store size={20} /> Dados da Barraca
            </button>
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-light)',
            textAlign: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem'
          }}>
            Maestria Beach v1.0.0
          </div>
        </aside>

        {/* Content Area */}
        <main className="content-area">
          {/* TAB 1: VISÃO GERAL (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Painel Financeiro & Vendas</h2>
              
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
                  <h3 style={{ fontSize: '2rem' }}>R$ {totalRevenue.toFixed(2)}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Soma de todos os caixas fechados</span>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                  <div className="flex-between" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>Pedidos Fechados</span>
                    <ShoppingBag size={20} style={{ color: 'var(--primary)' }} />
                  </div>
                  <h3 style={{ fontSize: '2rem' }}>{totalOrdersCount}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Clientes atendidos com sucesso</span>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
                  <div className="flex-between" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span>Ticket Médio</span>
                    <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h3 style={{ fontSize: '2rem' }}>R$ {averageTicket.toFixed(2)}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Média consumida por mesa/cliente</span>
                </div>
              </div>

              {/* Vendas por Canal e Histórico */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Faturamento por Método de Pagamento</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span>Pix ⚡</span>
                        <strong>R$ {paymentTotals.pix.toFixed(2)}</strong>
                      </div>
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px' }}>
                        <div style={{ 
                          height: '100%', 
                          background: 'var(--primary)', 
                          borderRadius: '4px',
                          width: `${totalRevenue > 0 ? (paymentTotals.pix / totalRevenue) * 100 : 0}%`
                        }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span>Cartão (Débito/Crédito) 💳</span>
                        <strong>R$ {paymentTotals.card.toFixed(2)}</strong>
                      </div>
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px' }}>
                        <div style={{ 
                          height: '100%', 
                          background: 'var(--secondary)', 
                          borderRadius: '4px',
                          width: `${totalRevenue > 0 ? (paymentTotals.card / totalRevenue) * 100 : 0}%`
                        }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span>Dinheiro em Espécie 💵</span>
                        <strong>R$ {paymentTotals.cash.toFixed(2)}</strong>
                      </div>
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px' }}>
                        <div style={{ 
                          height: '100%', 
                          background: 'var(--accent)', 
                          borderRadius: '4px',
                          width: `${totalRevenue > 0 ? (paymentTotals.cash / totalRevenue) * 100 : 0}%`
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Histórico Recente de Vendas</h3>
                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    {sales.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
                        Nenhum faturamento registrado ainda hoje.
                      </p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem 0' }}>Data/Hora</th>
                            <th>Pedidos</th>
                            <th style={{ textAlign: 'right' }}>Total do Dia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.slice().reverse().map(sale => (
                            <tr key={sale.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.75rem 0', color: 'var(--text-muted)' }}>
                                {new Date(sale.date).toLocaleString('pt-BR')}
                              </td>
                              <td>{sale.orderCount} mesas</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                                R$ {sale.totalSales.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GESTÃO DO CARDÁPIO (MENU) */}
          {activeTab === 'menu' && (
            <div>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem' }}>Gestão de Cardápio</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Cadastre e gerencie os itens e preços cobrados nas mesas.
                  </p>
                </div>
                <button onClick={() => setShowMenuModal(true)} className="btn btn-primary">
                  <Plus size={18} /> Adicionar Item
                </button>
              </div>

              {/* Categorias e Tabela */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Foto</th>
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
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>
                          <span className="badge badge-info">{item.category}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '300px' }}>
                          {item.description || 'Sem descrição.'}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>R$ {item.price.toFixed(2)}</td>
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

          {/* TAB 3: FUNCIONÁRIOS (EMPLOYEES) */}
          {activeTab === 'employees' && (
            <div>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem' }}>Equipe & Acessos</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Adicione funcionários e crie um PIN de login para usarem o sistema no celular.
                  </p>
                </div>
                <button onClick={() => setShowEmployeeModal(true)} className="btn btn-primary">
                  <Plus size={18} /> Adicionar Funcionário
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
              }}>
                {employees.map(emp => (
                  <div key={emp.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="flex-between">
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{emp.name}</h3>
                      <span className={`badge ${
                        emp.role === 'waiter' ? 'badge-info' : emp.role === 'kitchen' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {emp.role === 'waiter' ? 'Garçom' : emp.role === 'kitchen' ? 'Cozinha' : 'Caixa'}
                      </span>
                    </div>

                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: 'var(--text-muted)' }}>PIN de Login:</span>
                      <strong style={{ fontSize: '1.1rem', letterSpacing: '2px', color: 'var(--primary-dark)' }}>{emp.pin}</strong>
                    </div>

                    <div className="flex-between" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: 'auto' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>ID: {emp.id}</span>
                      {emp.id !== 'e1' && (
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)} 
                          className="btn btn-ghost" 
                          style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem', fontSize: '0.8rem', gap: '0.25rem' }}
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURAÇÕES DA BARRACA */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Configurações da Barraca</h2>
              
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
                    <label className="form-label">Emoji / Logo de Entrada</label>
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
                  <label className="form-label">Endereço da Barraca</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={storeAddress} 
                    onChange={e => setStoreAddress(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Telefone de Contato</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={storePhone} 
                      onChange={e => setStorePhone(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Número de Mesas / Guarda-sóis</label>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      min="0" 
                      max="30" 
                      value={storeServiceCharge} 
                      onChange={e => setStoreServiceCharge(Number(e.target.value))} 
                      required 
                    />
                    <Percent size={20} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  <Save size={18} /> Salvar Dados da Barraca
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: ADICIONAR ITEM DO CARDÁPIO */}
      {showMenuModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Novo Item de Cardápio</h3>
              <button onClick={() => setShowMenuModal(false)} className="btn btn-ghost" style={{ fontSize: '1.2rem' }}>×</button>
            </div>
            <form onSubmit={handleAddMenuItem}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Emoji</label>
                    <select 
                      className="form-control" 
                      value={newItemEmoji} 
                      onChange={e => setNewItemEmoji(e.target.value)}
                    >
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
                      <option value="🥗">🥗 Salada</option>
                      <option value="🍧">🍧 Sorvete</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Nome do Item</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ex: Isca de Peixe" 
                      value={newItemName} 
                      onChange={e => setNewItemName(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select 
                      className="form-control" 
                      value={newItemCategory} 
                      onChange={e => setNewItemCategory(e.target.value)}
                    >
                      <option value="Petiscos">Petiscos</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Sobremesas">Sobremesas</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preço Unitário (R$)</label>
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
                    rows={3} 
                    placeholder="Descrição breve dos ingredientes ou porção..." 
                    value={newItemDesc} 
                    onChange={e => setNewItemDesc(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowMenuModal(false)} className="btn btn-outline">Cancelar</button>
                <button type="submit" className="btn btn-primary">Adicionar ao Cardápio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR FUNCIONÁRIO */}
      {showEmployeeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>Adicionar Funcionário</h3>
              <button onClick={() => setShowEmployeeModal(false)} className="btn btn-ghost" style={{ fontSize: '1.2rem' }}>×</button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ex: Pedro Henrique" 
                    value={newEmpName} 
                    onChange={e => setNewEmpName(e.target.value)} 
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Função / Cargo</label>
                    <select 
                      className="form-control" 
                      value={newEmpRole} 
                      onChange={e => setNewEmpRole(e.target.value as any)}
                    >
                      <option value="waiter">Garçom (Pedidos no Celular)</option>
                      <option value="kitchen">Cozinha / Bar (Preparo)</option>
                      <option value="cashier">Caixa / Fechamento</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">PIN de Acesso (4 dígitos)</label>
                    <input 
                      type="text" 
                      maxLength={4} 
                      className="form-control" 
                      placeholder="Ex: 9876" 
                      value={newEmpPin} 
                      onChange={e => setNewEmpPin(e.target.value.replace(/\D/g, ''))} 
                      required 
                    />
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: 'var(--primary-light)',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--primary-dark)',
                  fontWeight: 500
                }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Com o PIN gerado, o funcionário conseguirá logar pelo próprio celular acessando a mesma página e digitando os 4 números cadastrados.
                  </span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="btn btn-outline">Cancelar</button>
                <button type="submit" className="btn btn-primary">Cadastrar na Equipe</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
