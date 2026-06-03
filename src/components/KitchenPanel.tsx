import React from 'react';
import { Order, Employee, OrderItem } from '../types';
import { Clock, CheckCircle, Flame, LogOut, Coffee } from 'lucide-react';

interface KitchenPanelProps {
  kitchenUser: Employee;
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  onLogout: () => void;
}

export const KitchenPanel: React.FC<KitchenPanelProps> = ({
  kitchenUser,
  orders,
  onUpdateOrder,
  onLogout
}) => {
  
  // Filtrar pedidos que contêm itens pendentes ou em preparo para a cozinha
  // (itens com status 'pending' ou 'preparing')
  const getActiveKitchenOrders = () => {
    return orders
      .filter(order => order.status === 'active')
      .map(order => {
        const kitchenItems = order.items.filter(
          item => item.status === 'pending' || item.status === 'preparing'
        );
        return {
          ...order,
          items: kitchenItems
        };
      })
      .filter(order => order.items.length > 0); // Só retorna se houver itens a fazer
  };

  const kitchenOrders = getActiveKitchenOrders();

  // Função para mudar o status de um item do pedido
  const handleUpdateItemStatus = (orderId: string, itemId: string, newStatus: 'preparing' | 'ready') => {
    const originalOrder = orders.find(o => o.id === orderId);
    if (!originalOrder) return;

    const updatedItems = originalOrder.items.map(item => {
      if (item.id === itemId) {
        return { ...item, status: newStatus };
      }
      return item;
    });

    onUpdateOrder({
      ...originalOrder,
      items: updatedItems
    });
  };

  // Atualizar todos os itens de um card de uma vez só
  const handleUpdateAllItemsStatus = (orderId: string, newStatus: 'preparing' | 'ready') => {
    const originalOrder = orders.find(o => o.id === orderId);
    if (!originalOrder) return;

    const updatedItems = originalOrder.items.map(item => {
      // Apenas atualiza os itens que ainda estão pendentes ou em preparo
      if (item.status === 'pending' || (newStatus === 'ready' && item.status === 'preparing')) {
        return { ...item, status: newStatus };
      }
      return item;
    });

    onUpdateOrder({
      ...originalOrder,
      items: updatedItems
    });
  };

  // Formatar tempo decorrido desde o envio
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
          }}>Monitor de Cozinha & Bar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Chef: <strong>{kitchenUser.name}</strong>
          </span>
          <button onClick={onLogout} className="btn btn-outline" style={{ gap: '0.5rem' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      {/* Main Kitchen Screen */}
      <main className="content-area" style={{ background: '#f1f5f9' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem' }}>Pedidos para Preparo</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Acompanhe e marque os pratos e bebidas conforme ficam prontos.
            </p>
          </div>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Fila de preparo: <span className="badge badge-danger">{kitchenOrders.length}</span>
            </span>
          </div>
        </div>

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
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Tudo Limpo na Cozinha!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum pedido pendente no momento. Relaxe um pouco!</p>
          </div>
        ) : (
          <div className="kitchen-orders-container">
            {kitchenOrders.map(order => {
              // Verifica se algum item está em preparo
              const hasPreparing = order.items.some(item => item.status === 'preparing');
              // Verifica o tempo do item mais antigo
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
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600, color: 'var(--danger)' }}>
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
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</span>
                          </div>
                          
                          {item.observations && (
                            <span className="kitchen-item-obs">
                              ⚠️ {item.observations}
                            </span>
                          )}
                        </div>

                        {/* Ações individuais por item */}
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

                  {/* Ações gerais do cartão */}
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
