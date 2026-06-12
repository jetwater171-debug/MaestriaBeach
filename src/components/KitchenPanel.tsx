import React, { useState, useEffect, useRef } from 'react';
import { Order, Employee, MenuItem } from '../types';
import { Clock, CheckCircle, Flame, LogOut, Coffee, Volume2, ShieldAlert } from 'lucide-react';

interface KitchenPanelProps {
  kitchenUser: Employee;
  orders: Order[];
  menuItems: MenuItem[];
  onUpdateOrder: (order: Order) => void;
  onLogout: () => void;
}

type ProductionFilter = 'all' | 'kitchen' | 'bar';

const isBarCategory = (category: string) => {
  const normalized = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return [
    'bebida',
    'bebidas',
    'drink',
    'drinks',
    'cerveja',
    'cervejas',
    'suco',
    'sucos',
    'refrigerante',
    'refrigerantes',
    'agua',
    'aguas',
    'caipirinha',
    'caipirinhas',
    'vinho',
    'vinhos',
    'destilado',
    'destilados'
  ].some(keyword => normalized.includes(keyword));
};

export const KitchenPanel: React.FC<KitchenPanelProps> = ({
  kitchenUser,
  orders,
  menuItems,
  onUpdateOrder,
  onLogout
}) => {
  const [filterMode, setFilterMode] = useState<ProductionFilter>('all');
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Helper para buscar a categoria do prato via menuItems
  const getItemCategory = (menuItemId: string) => {
    return menuItems.find(m => m.id === menuItemId)?.category || 'Cozinha';
  };

  // 1. Sintetizador de Som (AudioContext) programático para dispensar arquivos externos
  const playNewOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Nota 1 (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      // Nota 2 (A5) após um atraso curto
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 100);
    } catch (e) {
      console.warn('AudioContext não pôde ser ativado:', e);
    }
  };

  // 2. Ouvinte que toca o sino se o número de itens PENDENTES aumentar
  const activeOrders = orders.filter(o => o.status === 'active');
  const pendingItemsCount = activeOrders
    .flatMap(o => o.items)
    .filter(item => item.status === 'pending').length;

  const prevPendingCountRef = useRef(pendingItemsCount);

  useEffect(() => {
    // Só reproduz se a contagem subir e se o áudio estiver ativado pelo clique
    if (pendingItemsCount > prevPendingCountRef.current && audioEnabled) {
      playNewOrderChime();
    }
    prevPendingCountRef.current = pendingItemsCount;
  }, [pendingItemsCount, audioEnabled]);

  // 3. Filtragem de pedidos por Cozinha (Petiscos/Pratos) vs Bar (Bebidas)
  const getFilteredKitchenOrders = () => {
    return orders
      .filter(order => order.status === 'active')
      .map(order => {
        const kitchenItems = order.items.filter(item => {
          // Filtra status pendente ou preparando
          const isActive = item.status === 'pending' || item.status === 'preparing';
          if (!isActive) return false;

          // Filtra por Categoria de Produção
          const itemCat = getItemCategory(item.menuItemId);
          const isBarItem = isBarCategory(itemCat);
          if (filterMode === 'bar') {
            return isBarItem;
          }
          if (filterMode === 'kitchen') {
            return !isBarItem;
          }
          return true; // Mode 'all'
        });

        return {
          ...order,
          items: kitchenItems
        };
      })
      .filter(order => order.items.length > 0);
  };

  const kitchenOrders = getFilteredKitchenOrders();

  // Mudar status de um item
  const handleUpdateItemStatus = (orderId: string, itemId: string, newStatus: 'preparing' | 'ready') => {
    const originalOrder = orders.find(o => o.id === orderId);
    if (!originalOrder) return;

    const updatedItems = originalOrder.items.map(item => {
      if (item.id === itemId) {
        return { 
          ...item, 
          status: newStatus === 'ready' ? 'ready' as const : 'preparing' as const
        };
      }
      return item;
    });

    onUpdateOrder({
      ...originalOrder,
      items: updatedItems
    });
  };

  // Mudar status de todos os itens do card de uma vez
  const handleUpdateAllItemsStatus = (orderId: string, newStatus: 'preparing' | 'ready') => {
    const originalOrder = orders.find(o => o.id === orderId);
    if (!originalOrder) return;

    // Filtra apenas os itens exibidos atualmente no card com base na categoria
    const updatedItems = originalOrder.items.map(item => {
      const itemCat = getItemCategory(item.menuItemId);
      const isBarItem = isBarCategory(itemCat);
      const isItemMatchingFilter = 
        filterMode === 'all' ||
        (filterMode === 'bar' && isBarItem) ||
        (filterMode === 'kitchen' && !isBarItem);

      if (isItemMatchingFilter) {
        if (item.status === 'pending' || (newStatus === 'ready' && item.status === 'preparing')) {
          return { 
            ...item, 
            status: newStatus === 'ready' ? 'ready' as const : 'preparing' as const
          };
        }
      }
      return item;
    });

    onUpdateOrder({
      ...originalOrder,
      items: updatedItems
    });
  };

  const getTimeElapsed = (sentAtString: string) => {
    const sentAt = new Date(sentAtString);
    const now = new Date();
    const diffMs = now.getTime() - sentAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    return `${diffMins} min atrás`;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="brand-header">
        <div className="brand-logo">
          <div className="brand-logo-icon">🍳</div>
          <span>Maestria Beach</span>
          <span style={{
            fontSize: '0.8rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '50px',
            backgroundColor: 'var(--secondary-light)',
            color: 'var(--secondary)',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            marginLeft: '0.5rem'
          }}>Cozinha & Bar</span>
        </div>

        {/* Ativação do Áudio de Notificação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => {
              setAudioEnabled(prev => !prev);
              playNewOrderChime(); // Toca para testar
            }}
            className="btn"
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              backgroundColor: audioEnabled ? 'var(--primary-light)' : 'rgba(239, 68, 68, 0.08)',
              color: audioEnabled ? 'var(--primary-dark)' : 'var(--danger)',
              border: '1px solid',
              borderColor: audioEnabled ? 'var(--primary)' : 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Volume2 size={14} />
            {audioEnabled ? 'Som Ativo 🔔' : 'Som Mudo 🔕 (Clique para Ativar)'}
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Chefe: <strong>{kitchenUser.name}</strong>
          </span>
          <button onClick={onLogout} className="btn btn-outline" style={{ gap: '0.5rem', padding: '0.4rem 1rem' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      {/* Main Screen */}
      <main className="content-area" style={{ background: '#f1f5f9' }}>
        
        {/* Controle de Abas Cozinha / Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Fila de Produção</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ordens de pratos e drinks lançadas pelos garçons.</p>
          </div>

          {/* Abas de Divisão do Quiosque */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(226, 232, 240, 0.8)',
            padding: '4px',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <button
              onClick={() => setFilterMode('all')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: filterMode === 'all' ? 'white' : 'transparent',
                color: filterMode === 'all' ? 'var(--primary-dark)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              📋 Geral ({orders.filter(o => o.status === 'active').flatMap(o => o.items).filter(i => i.status === 'pending' || i.status === 'preparing').length})
            </button>
            <button
              onClick={() => setFilterMode('kitchen')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: filterMode === 'kitchen' ? 'white' : 'transparent',
                color: filterMode === 'kitchen' ? 'var(--primary-dark)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              🍔 Cozinha (Comidas)
            </button>
            <button
              onClick={() => setFilterMode('bar')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: filterMode === 'bar' ? 'white' : 'transparent',
                color: filterMode === 'bar' ? 'var(--primary-dark)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              🍹 Bar / Bebidas
            </button>
          </div>
        </div>

        {/* Notificação se o som estiver desativado */}
        {!audioEnabled && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            color: '#b45309',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}>
            <ShieldAlert size={16} />
            <span>
              O navegador bloqueia som automático. Por favor, clique em <strong>"Som Mudo 🔕"</strong> no topo para ativar os avisos sonoros de novos pedidos.
            </span>
          </div>
        )}

        {kitchenOrders.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Coffee size={48} style={{ color: 'var(--text-light)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Nenhum Pedido na Fila!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {filterMode === 'bar' ? 'Nenhuma bebida pendente.' : filterMode === 'kitchen' ? 'Nenhuma refeição pendente.' : 'Tudo limpo por enquanto!'}
            </p>
          </div>
        ) : (
          <div className="kitchen-orders-container">
            {kitchenOrders.map(order => {
              const hasPreparing = order.items.some(item => item.status === 'preparing');
              const oldestItemTime = order.items.reduce((oldest, current) => {
                return new Date(current.sentAt) < new Date(oldest) ? current.sentAt : oldest;
              }, order.items[0].sentAt);

              return (
                <div 
                  key={order.id} 
                  className={`kitchen-card ${hasPreparing ? 'cooking' : ''}`}
                >
                  <div className="kitchen-card-header">
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>Mesa {order.tableNumber}</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Garçom: {order.waiterName}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: 'var(--danger)' }}>
                        <Clock size={12} /> {getTimeElapsed(oldestItemTime)}
                      </span>
                    </div>
                  </div>

                  <div className="kitchen-card-body">
                    {order.items.map(item => (
                      <div key={item.id} className="kitchen-item">
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className="kitchen-item-quantity">{item.quantity}x</span>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                              {item.name}{' '}
                              <span style={{
                                fontSize: '0.65rem',
                                color: isBarCategory(getItemCategory(item.menuItemId)) ? 'var(--primary)' : 'var(--secondary)',
                                backgroundColor: isBarCategory(getItemCategory(item.menuItemId)) ? 'var(--primary-light)' : 'var(--secondary-light)',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontWeight: 700,
                                marginLeft: '6px'
                              }}>
                                {isBarCategory(getItemCategory(item.menuItemId)) ? 'Bar' : 'Cozinha'}
                              </span>
                            </span>
                          </div>
                          
                          {item.observations && (
                            <span className="kitchen-item-obs">
                              ⚠️ {item.observations}
                            </span>
                          )}
                        </div>

                        {/* Ações */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {item.status === 'pending' ? (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, item.id, 'preparing')}
                              className="btn btn-ghost"
                              style={{
                                color: 'var(--accent)',
                                backgroundColor: 'var(--accent-light)',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                borderRadius: '6px'
                              }}
                            >
                              <Flame size={12} /> Preparar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateItemStatus(order.id, item.id, 'ready')}
                              className="btn btn-ghost"
                              style={{
                                color: 'var(--success)',
                                backgroundColor: 'var(--success-light)',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                borderRadius: '6px'
                              }}
                            >
                              <CheckCircle size={12} /> Pronto
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    padding: '1rem',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: '#fafafa',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px'
                  }}>
                    <button
                      onClick={() => handleUpdateAllItemsStatus(order.id, 'preparing')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                      disabled={order.items.every(item => item.status === 'preparing')}
                    >
                      <Flame size={14} /> Preparar Todos
                    </button>
                    <button
                      onClick={() => handleUpdateAllItemsStatus(order.id, 'ready')}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.5rem', background: 'var(--success)' }}
                    >
                      <CheckCircle size={14} /> Concluir Tudo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
