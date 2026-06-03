import React, { useState } from 'react';
import { Order, Employee, StoreInfo, DailySale } from '../types';
import { 
  DollarSign, Receipt, Percent, ShieldCheck, LogOut, 
  CreditCard, Coins, Check, Calculator, AlertTriangle 
} from 'lucide-react';

interface CashierPanelProps {
  cashierUser: Employee;
  storeInfo: StoreInfo;
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  onCloseOrder: (orderId: string, paymentMethod: 'pix' | 'card' | 'cash', discount: number, serviceCharge: number, total: number) => void;
  onLogout: () => void;
}

export const CashierPanel: React.FC<CashierPanelProps> = ({
  cashierUser,
  storeInfo,
  orders,
  onUpdateOrder,
  onCloseOrder,
  onLogout
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Estados para cálculos do fechamento
  const [applyServiceCharge, setApplyServiceCharge] = useState(true);
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash' | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Apenas ordens ativas
  const activeOrders = orders.filter(o => o.status === 'active');
  const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);

  // Cálculos financeiros
  const subtotal = selectedOrder ? selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
  const serviceCharge = applyServiceCharge ? (subtotal * (storeInfo.serviceChargePercent / 100)) : 0;
  const discount = Number(discountInput) || 0;
  const total = Math.max(0, subtotal + serviceCharge - discount);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setPaymentMethod(null);
    setDiscountInput('');
    setShowReceipt(false);
  };

  const handleCloseTable = () => {
    if (!selectedOrder || !paymentMethod) return;
    
    // Verifica se há algum item que não foi entregue na cozinha
    const hasUnpreparedItems = selectedOrder.items.some(item => item.status !== 'delivered');
    if (hasUnpreparedItems) {
      if (!confirm('Esta mesa possui itens que ainda não foram entregues ou preparados. Deseja fechar a conta mesmo assim?')) {
        return;
      }
    }

    onCloseOrder(selectedOrder.id, paymentMethod, discount, serviceCharge, total);
    alert(`Conta da Mesa ${selectedOrder.tableNumber} fechada com sucesso via ${paymentMethod.toUpperCase()}! 💸`);
    
    // Resetar estado local
    setSelectedOrderId(null);
    setPaymentMethod(null);
    setDiscountInput('');
    setShowReceipt(false);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="brand-header">
        <div className="brand-logo">
          <div className="brand-logo-icon">💰</div>
          <span>Maestria Beach</span>
          <span style={{
            fontSize: '0.8rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '50px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            marginLeft: '0.5rem'
          }}>Caixa e Fechamento</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Caixa: <strong>{cashierUser.name}</strong>
          </span>
          <button onClick={onLogout} className="btn btn-outline" style={{ gap: '0.5rem' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      {/* Main Cashier Workspace */}
      <main className="content-area">
        <div className="cashier-layout">
          
          {/* Coluna Esquerda: Lista de Mesas Ativas */}
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Controle de Mesas & Contas</h2>
            
            {activeOrders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: 'white',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <Receipt size={48} style={{ color: 'var(--text-light)', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Sem Mesas Ativas</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum cliente consumindo no momento. Aguardando garçom...</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {activeOrders.map(order => {
                  const orderSum = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                  const isSelected = order.id === selectedOrderId;
                  
                  // Se garçom solicitou conta, ou todos os pratos estão prontos
                  const allDelivered = order.items.every(i => i.status === 'delivered');
                  
                  return (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrder(order.id)}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'white' : 'var(--bg-card)',
                        transform: isSelected ? 'scale(1.02)' : 'none',
                        position: 'relative',
                        boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
                      }}
                    >
                      {allDelivered && (
                        <span className="badge badge-success" style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          fontSize: '0.55rem'
                        }}>Pronta</span>
                      )}

                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                        Mesa {order.tableNumber}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Atendente: {order.waiterName.split(' ')[0]}
                      </p>
                      <div className="flex-between">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Consumo:</span>
                        <strong style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>
                          R$ {orderSum.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita: Detalhamento de Conta Selecionada */}
          <div>
            {selectedOrder ? (
              <div className="bill-details glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Fechamento Mesa {selectedOrder.tableNumber}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>ID: {selectedOrder.id.substr(4, 6)}</span>
                </div>

                {/* Lista de itens consumidos */}
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '1rem',
                  marginBottom: '1rem'
                }}>
                  {selectedOrder.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <div style={{ flexGrow: 1 }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.quantity}x </span>
                        <span>{item.name}</span>
                        {item.status !== 'delivered' && (
                          <span style={{ color: 'var(--accent)', fontSize: '0.7rem', marginLeft: '5px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <AlertTriangle size={10} /> Em preparo
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Subtotais e acréscimos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal do consumo:</span>
                    <strong>R$ {subtotal.toFixed(2)}</strong>
                  </div>

                  <div className="flex-between">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <input 
                        type="checkbox" 
                        id="svc"
                        checked={applyServiceCharge} 
                        onChange={(e) => setApplyServiceCharge(e.target.checked)} 
                      />
                      <label htmlFor="svc" style={{ cursor: 'pointer' }}>Taxa de serviço ({storeInfo.serviceChargePercent}%)</label>
                    </span>
                    <span>R$ {serviceCharge.toFixed(2)}</span>
                  </div>

                  <div className="flex-between" style={{ alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Desconto manual (R$):</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className="form-control" 
                      style={{ width: '90px', padding: '0.25rem 0.5rem', fontSize: '0.85rem', textAlign: 'right' }}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)} 
                    />
                  </div>

                  <div className="flex-between" style={{ borderTop: '2px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Total Geral:</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--success)' }}>R$ {total.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Métodos de Pagamento */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="form-label" style={{ marginBottom: '0.5rem' }}>Selecione o Meio de Pagamento</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      onClick={() => setPaymentMethod('pix')}
                      style={{
                        padding: '0.75rem 0.25rem',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: paymentMethod === 'pix' ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: paymentMethod === 'pix' ? 'var(--primary-light)' : 'white',
                        color: paymentMethod === 'pix' ? 'var(--primary-dark)' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>⚡</span>
                      <span>PIX</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('card')}
                      style={{
                        padding: '0.75rem 0.25rem',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: paymentMethod === 'card' ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: paymentMethod === 'card' ? 'var(--primary-light)' : 'white',
                        color: paymentMethod === 'card' ? 'var(--primary-dark)' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CreditCard size={16} />
                      <span>Cartão</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('cash')}
                      style={{
                        padding: '0.75rem 0.25rem',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: paymentMethod === 'cash' ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: paymentMethod === 'cash' ? 'var(--primary-light)' : 'white',
                        color: paymentMethod === 'cash' ? 'var(--primary-dark)' : 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Coins size={16} />
                      <span>Dinheiro</span>
                    </button>
                  </div>
                </div>

                {/* Simulação de PIX QR Code */}
                {paymentMethod === 'pix' && (
                  <div className="glass-panel" style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>⚡ PIX Gerado para Celular do Cliente</span>
                    <div style={{
                      margin: '0.5rem 0',
                      width: '100px',
                      height: '100px',
                      backgroundColor: 'white',
                      border: '4px solid #334155',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem'
                    }}>📱</div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>O cliente pode escanear ou copiar a chave Pix Copia e Cola</span>
                  </div>
                )}

                {/* Ações de Fechamento */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => setShowReceipt(true)}
                    className="btn btn-outline"
                    style={{ width: '100%' }}
                  >
                    <Receipt size={16} /> Ver Recibo Digital
                  </button>
                  
                  <button
                    onClick={handleCloseTable}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', gap: '0.5rem' }}
                    disabled={!paymentMethod}
                  >
                    <Check size={18} /> Fechar Caixa da Mesa
                  </button>
                </div>
              </div>
            ) : (
              <div className="bill-details glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                <Calculator size={36} style={{ color: 'var(--text-light)', marginBottom: '0.75rem' }} />
                <h3>Detalhamento da Conta</h3>
                <p style={{ fontSize: '0.85rem' }}>Selecione uma mesa ativa ao lado para realizar o fechamento e emitir o recibo.</p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MODAL: RECIBO DIGITAL SIMULADO */}
      {showReceipt && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', fontFamily: 'monospace' }}>
            <div className="modal-header" style={{ fontFamily: 'var(--font-title)' }}>
              <h3>Cupom Não Fiscal</h3>
              <button onClick={() => setShowReceipt(false)} className="btn btn-ghost">×</button>
            </div>
            
            <div className="modal-body" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <strong style={{ fontSize: '1.1rem' }}>{storeInfo.name}</strong><br />
                {storeInfo.address && <>{storeInfo.address}<br /></>}
                {storeInfo.phone && <>{storeInfo.phone}<br /></>}
                ----------------------------------------<br />
                <strong>RECIBO DE MESA Nº {selectedOrder.tableNumber}</strong>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                Data: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}<br />
                Atendente: {selectedOrder.waiterName}<br />
                Mesa: {selectedOrder.tableNumber}<br />
                ----------------------------------------
              </div>

              <div style={{ marginBottom: '1rem' }}>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.quantity}x {item.name.padEnd(20, '.').substr(0, 20)}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                ----------------------------------------
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div>Subtotal: R$ {subtotal.toFixed(2)}</div>
                {applyServiceCharge && <div>Serviço ({storeInfo.serviceChargePercent}%): R$ {serviceCharge.toFixed(2)}</div>}
                {discount > 0 && <div>Desconto: R$ -{discount.toFixed(2)}</div>}
                <div style={{ fontSize: '1.05rem', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px' }}>
                  TOTAL A PAGAR: R$ {total.toFixed(2)}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.75rem', borderTop: '1px dashed #000', paddingTop: '1rem', marginTop: '1rem' }}>
                Maestria Beach - Agradecemos a preferência!<br />
                Volte Sempre! 🏝️
              </div>
            </div>

            <div className="modal-footer" style={{ fontFamily: 'var(--font-title)' }}>
              <button onClick={() => setShowReceipt(false)} className="btn btn-primary" style={{ width: '100%' }}>Ok, Fechar Recibo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
