import React, { useState, useEffect } from 'react';
import { MenuItem, Employee, Order, OrderItem, Table, TableStatus } from '../types';
import { 
  ClipboardList, ShoppingCart, User, LogOut, CheckCircle, 
  Clock, Flame, Plus, Minus, Search, X, UtensilsCrossed, 
  Calculator, CheckSquare, Coins 
} from 'lucide-react';

interface WaiterPanelProps {
  waiter: Employee;
  menuItems: MenuItem[];
  orders: Order[];
  onAddOrder: (order: Order) => void;
  onUpdateOrder: (order: Order) => void;
  tablesCount: number;
  onLogout: () => void;
}

type SubTabType = 'tables' | 'new-order' | 'my-orders';

export const WaiterPanel: React.FC<WaiterPanelProps> = ({
  waiter,
  menuItems,
  orders,
  onAddOrder,
  onUpdateOrder,
  tablesCount,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<SubTabType>('tables');
  
  // Mesa ativa e controles
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [showTableOpsModal, setShowTableOpsModal] = useState(false);
  const [cart, setCart] = useState<{ [menuItemId: string]: { quantity: number; observations: string } }>({});
  
  // Estado da calculadora de divisão de conta
  const [showSplitCalc, setShowSplitCalc] = useState(false);
  const [splitPeople, setSplitPeople] = useState('2');

  // Filtro de cardápio
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auxiliares de categorias
  const categories = ['Todos', ...Array.from(new Set(menuItems.map(item => item.category)))];

  // Monitor de tempo (força re-render a cada minuto para atualizar os timers das mesas)
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Formata o tempo decorrido de uma mesa ocupada
  const getTableOccupiedTime = (createdAtString?: string) => {
    if (!createdAtString) return '';
    const created = new Date(createdAtString);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Abril agora';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h${mins > 0 ? mins + 'm' : ''}`;
  };

  // Listagem dinâmica das mesas
  const getTables = (): Table[] => {
    const list: Table[] = [];
    for (let i = 1; i <= tablesCount; i++) {
      const activeOrder = orders.find(o => o.tableNumber === i && o.status === 'active');
      let status: TableStatus = 'available';
      
      if (activeOrder) {
        // Se já pediu a conta ou está aguardando fechamento
        const hasWaitingBill = activeOrder.items.length > 0 && activeOrder.items.every(item => item.status === 'delivered');
        status = hasWaitingBill ? 'waiting_bill' : 'occupied';
      }
      list.push({ number: i, status, activeOrderId: activeOrder?.id });
    }
    return list;
  };

  const tables = getTables();

  // Garçom clica em uma mesa da grade
  const handleTableClick = (tableNumber: number) => {
    setSelectedTable(tableNumber);
    const activeOrder = orders.find(o => o.tableNumber === tableNumber && o.status === 'active');
    
    if (activeOrder) {
      // Mesa já está ocupada: abre modal de opções
      setShowTableOpsModal(true);
    } else {
      // Mesa está livre: abre direto a tela de novo pedido
      setCart({});
      setActiveTab('new-order');
    }
  };

  // Garçom solicita o fechamento (chama o caixa)
  const handleRequestBill = (tableNumber: number) => {
    const activeOrder = orders.find(o => o.tableNumber === tableNumber && o.status === 'active');
    if (!activeOrder) return;
    
    // Marca todos os itens pendentes como entregues e atualiza ordem
    const updatedItems = activeOrder.items.map(item => ({
      ...item,
      status: 'delivered' as const
    }));

    onUpdateOrder({
      ...activeOrder,
      items: updatedItems
    });
    
    alert(`Fechamento da mesa ${tableNumber} solicitado ao caixa! 💰`);
    setShowTableOpsModal(false);
  };

  // Funções do Carrinho
  const addToCart = (menuItemId: string) => {
    setCart(prev => ({
      ...prev,
      [menuItemId]: {
        quantity: (prev[menuItemId]?.quantity || 0) + 1,
        observations: prev[menuItemId]?.observations || ''
      }
    }));
  };

  const removeFromCart = (menuItemId: string) => {
    if (!cart[menuItemId]) return;
    
    setCart(prev => {
      const updated = { ...prev };
      if (updated[menuItemId].quantity <= 1) {
        delete updated[menuItemId];
      } else {
        updated[menuItemId] = {
          ...updated[menuItemId],
          quantity: updated[menuItemId].quantity - 1
        };
      }
      return updated;
    });
  };

  const updateObservations = (menuItemId: string, obs: string) => {
    setCart(prev => ({
      ...prev,
      [menuItemId]: {
        ...prev[menuItemId],
        observations: obs
      }
    }));
  };

  const handleSendOrder = () => {
    if (!selectedTable) return;
    
    const cartEntries = Object.entries(cart);
    if (cartEntries.length === 0) {
      alert('Selecione pelo menos um item para enviar.');
      return;
    }

    const activeOrder = orders.find(o => o.tableNumber === selectedTable && o.status === 'active');
    const newItems: OrderItem[] = cartEntries.map(([itemId, cartItem]) => {
      const menuItem = menuItems.find(m => m.id === itemId)!;
      return {
        id: 'oi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        menuItemId: itemId,
        name: menuItem.name,
        price: menuItem.isPromotion && menuItem.promotionalPrice ? menuItem.promotionalPrice : menuItem.price,
        quantity: cartItem.quantity,
        observations: cartItem.observations,
        status: 'pending',
        sentAt: new Date().toISOString()
      };
    });

    if (activeOrder) {
      const updatedItems = [...activeOrder.items, ...newItems];
      const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      onUpdateOrder({
        ...activeOrder,
        items: updatedItems,
        subtotal
      });
      alert(`Itens adicionados com sucesso à Mesa ${selectedTable}! 🍽9`);
    } else {
      const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const newOrder: Order = {
        id: 'ord_' + Date.now(),
        tableNumber: selectedTable,
        waiterId: waiter.id,
        waiterName: waiter.name,
        items: newItems,
        status: 'active',
        createdAt: new Date().toISOString(),
        subtotal,
        serviceCharge: 0,
        discount: 0,
        total: subtotal
      };
      
      onAddOrder(newOrder);
      alert(`Novo pedido iniciado na Mesa ${selectedTable}! 🔥`);
    }

    setCart({});
    setSelectedTable(null);
    setActiveTab('tables');
  };

  // Filtrar itens do cardápio
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.isAvailable;
  });

  const myActiveOrders = orders.filter(o => o.waiterId === waiter.id && o.status === 'active');
  const activeOrderForSelectedTable = selectedTable ? orders.find(o => o.tableNumber === selectedTable && o.status === 'active') : null;

  return (
    <div className="mobile-view">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem'
          }}>🏖️</div>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Maestria Beach</h4>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <User size={10} /> Garçom: {waiter.name.split(' ')[0]}
            </span>
          </div>
        </div>
        <button onClick={onLogout} style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--danger)',
          cursor: 'pointer'
        }}>
          <LogOut size={20} />
        </button>
      </header>

      {/* Mobile Content */}
      <div className="mobile-content">
        
        {/* TELA 1: SELEÇÃO DE MESAS */}
        {activeTab === 'tables' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Mesas & Guarda-sóis</h3>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--success)' }}>● Livre</span>
                <span style={{ color: 'var(--primary)' }}>● Ocupada</span>
              </div>
            </div>
            
            <div className="tables-grid">
              {tables.map(table => {
                const isActive = !!table.activeOrderId;
                const orderData = orders.find(o => o.id === table.activeOrderId);
                const tableTime = orderData ? getTableOccupiedTime(orderData.createdAt) : '';

                return (
                  <div 
                    key={table.number} 
                    className={`table-card ${isActive ? 'occupied' : 'available'}`}
                    onClick={() => handleTableClick(table.number)}
                  >
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', position: 'absolute', top: '8px', left: '10px' }}>
                      {isActive ? 'Ocupada' : 'Livre'}
                    </span>
                    <span className="table-number">{table.number}</span>
                    {isActive && tableTime && (
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        color: 'var(--primary-dark)',
                        position: 'absolute',
                        bottom: '8px'
                      }}>
                        ⏱️ {tableTime}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TELA 2: NOVO PEDIDO / ADICIONAR ITENS */}
        {activeTab === 'new-order' && (
          <div>
            {selectedTable === null ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Selecione uma mesa primeiro na grade.</p>
                <button onClick={() => setActiveTab('tables')} className="btn btn-primary">Voltar para Mesas</button>
              </div>
            ) : (
              <div>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>Mesa {selectedTable}: Lançar Pedido</h3>
                  <button onClick={() => { setSelectedTable(null); setActiveTab('tables'); }} className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--text-muted)' }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <input 
                    type="text" 
                    placeholder="Pesquisar prato ou bebida..." 
                    className="form-control"
                    style={{ paddingLeft: '2.25rem', borderRadius: '12px' }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                </div>

                {/* Categorias */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  overflowX: 'auto', 
                  paddingBottom: '0.5rem',
                  marginBottom: '1rem',
                  scrollbarWidth: 'none'
                }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: selectedCategory === cat ? 'var(--primary-light)' : 'white',
                        color: selectedCategory === cat ? 'var(--primary-dark)' : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Cardápio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {filteredMenuItems.map(item => {
                    const cartQty = cart[item.id]?.quantity || 0;
                    return (
                      <div key={item.id} className="glass-panel" style={{ padding: '0.75rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ fontSize: '1.75rem' }}>{item.imageUrl}</div>
                        <div style={{ flexGrow: 1 }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.name}</h4>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)' }}>
                            R$ {(item.isPromotion && item.promotionalPrice ? item.promotionalPrice : item.price).toFixed(2)}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {cartQty > 0 ? (
                            <>
                              <button onClick={() => removeFromCart(item.id)} style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Minus size={14} />
                              </button>
                              <span style={{ fontWeight: 700, width: '16px', textAlign: 'center' }}>{cartQty}</span>
                            </>
                          ) : null}
                          <button onClick={() => addToCart(item.id)} style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Observações */}
                {Object.keys(cart).length > 0 && (
                  <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: '#fdfbf7' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent)' }}>
                      📝 Observações do Pedido
                    </h4>
                    {Object.entries(cart).map(([itemId, cartItem]) => {
                      const menuItem = menuItems.find(m => m.id === itemId)!;
                      return (
                        <div key={itemId} style={{ marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{menuItem.name} ({cartItem.quantity}x)</span>
                          <input
                            type="text"
                            placeholder="Observação (Ex: Sem cebola, gelo à parte)"
                            className="form-control"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', marginTop: '3px' }}
                            value={cartItem.observations}
                            onChange={(e) => updateObservations(itemId, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botão de Enviar */}
                {Object.keys(cart).length > 0 && (
                  <button 
                    onClick={handleSendOrder} 
                    className="btn btn-primary" 
                    style={{ width: '100%', borderRadius: '12px', padding: '1rem', position: 'sticky', bottom: '70px', zIndex: 5 }}
                  >
                    <UtensilsCrossed size={18} /> Enviar {Object.values(cart).reduce((s, i) => s + i.quantity, 0)} Pedido(s) à Cozinha
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TELA 3: MEUS PEDIDOS / STATUS */}
        {activeTab === 'my-orders' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Meus Lançamentos do Dia</h3>
            {myActiveOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p>Nenhum pedido ativo lançado por você no momento.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myActiveOrders.map(order => (
                  <div key={order.id} className="glass-panel" style={{ padding: '1rem' }}>
                    <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                      <strong>Mesa {order.tableNumber}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleTimeString('pt-BR')}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex-between" style={{ fontSize: '0.8rem' }}>
                          <span>{item.quantity}x {item.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            {item.status === 'pending' && <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}><Clock size={10} /> Pendente</span>}
                            {item.status === 'preparing' && <span className="badge badge-info" style={{ fontSize: '0.6rem' }}><Flame size={10} /> Preparando</span>}
                            {item.status === 'ready' && <span className="badge badge-success ready-badge-pulse" style={{ fontSize: '0.6rem' }}><CheckCircle size={10} /> Pronto</span>}
                            {item.status === 'delivered' && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Entregue</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL INTERATIVO: OPERAÇÕES DA MESA OCUPADA */}
      {showTableOpsModal && activeOrderForSelectedTable && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '24px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Mesa {selectedTable}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ⏱️ Consumindo há {getTableOccupiedTime(activeOrderForSelectedTable.createdAt)}
                </span>
              </div>
              <button onClick={() => { setShowTableOpsModal(false); setShowSplitCalc(false); }} className="btn btn-ghost" style={{ fontSize: '1.2rem' }}>×</button>
            </div>

            <div className="modal-body">
              {/* Resumo do Consumo */}
              <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem', backgroundColor: '#f8fafc' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Itens Lançados</h4>
                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {activeOrderForSelectedTable.items.map((item, idx) => (
                    <div key={idx} className="flex-between" style={{ fontSize: '0.8rem' }}>
                      <span>{item.quantity}x {item.name}</span>
                      <strong style={{ color: 'var(--text-muted)' }}>R$ {(item.price * item.quantity).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px', fontWeight: 700 }}>
                  <span>Subtotal:</span>
                  <span style={{ color: 'var(--secondary)', fontSize: '1.05rem' }}>
                    R$ {activeOrderForSelectedTable.items.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botão Calculadora de Divisão de Conta */}
              {!showSplitCalc ? (
                <button 
                  onClick={() => setShowSplitCalc(true)} 
                  className="btn btn-outline" 
                  style={{ width: '100%', marginBottom: '1.25rem', borderRadius: '12px', gap: '8px' }}
                >
                  <Calculator size={16} /> Dividir Conta (Calcular por Pessoa)
                </button>
              ) : (
                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem', borderColor: 'var(--primary-light)', backgroundColor: 'var(--primary-light)' }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)' }}>🧮 Divisão por Pessoa</span>
                    <button onClick={() => setShowSplitCalc(false)} className="btn btn-ghost" style={{ padding: 0, fontSize: '0.75rem', color: 'var(--primary-dark)' }}>Esconder</button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Dividir entre:</span>
                    <input 
                      type="number" 
                      min="1" 
                      className="form-control" 
                      style={{ width: '70px', padding: '4px 8px', borderRadius: '8px', fontSize: '0.85rem' }}
                      value={splitPeople}
                      onChange={e => setSplitPeople(e.target.value)} 
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>pessoas</span>
                  </div>

                  {/* Cálculos da Divisão */}
                  {(() => {
                    const sub = activeOrderForSelectedTable.items.reduce((s, i) => s + (i.price * i.quantity), 0);
                    const people = Number(splitPeople) || 1;
                    const splitValue = sub / people;
                    const splitWithService = (sub * 1.1) / people;

                    return (
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="flex-between">
                          <span>Apenas consumo:</span>
                          <strong>R$ {splitValue.toFixed(2)} por pessoa</strong>
                        </div>
                        <div className="flex-between" style={{ color: 'var(--primary-dark)' }}>
                          <span>Com +10% de serviço:</span>
                          <strong>R$ {splitWithService.toFixed(2)} por pessoa</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Ações principais */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => {
                    setCart({});
                    setShowTableOpsModal(false);
                    setActiveTab('new-order');
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', borderRadius: '12px', gap: '6px' }}
                >
                  <Plus size={16} /> Adicionar Novos Itens
                </button>

                <button
                  onClick={() => handleRequestBill(selectedTable!)}
                  className="btn btn-secondary"
                  style={{ width: '100%', borderRadius: '12px', gap: '6px', background: 'var(--success)' }}
                >
                  <Coins size={16} /> Solicitar Fechamento ao Caixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Footer Navigation */}
      <nav className="mobile-nav">
        <button 
          onClick={() => { setActiveTab('tables'); setShowTableOpsModal(false); }} 
          className={`mobile-nav-btn ${activeTab === 'tables' ? 'active' : ''}`}
        >
          <UtensilsCrossed size={20} />
          <span>Mesas</span>
        </button>
        <button 
          onClick={() => { 
            // Abre o lançamento para a última mesa selecionada ou pede seleção
            if (selectedTable === null) {
              alert('Selecione uma mesa primeiro na aba anterior.');
              setActiveTab('tables');
            } else {
              setCart({});
              setActiveTab('new-order');
            }
          }} 
          className={`mobile-nav-btn ${activeTab === 'new-order' ? 'active' : ''}`}
        >
          <ShoppingCart size={20} />
          <span>Lançar</span>
        </button>
        <button 
          onClick={() => { setActiveTab('my-orders'); setShowTableOpsModal(false); }} 
          className={`mobile-nav-btn ${activeTab === 'my-orders' ? 'active' : ''}`}
        >
          <ClipboardList size={20} />
          <span>Status</span>
        </button>
      </nav>
    </div>
  );
};
