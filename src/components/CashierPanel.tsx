import React, { useState, useEffect } from 'react';
import { Order, Employee, StoreInfo } from '../types';
import { 
  DollarSign, Receipt, Percent, ShieldCheck, LogOut, 
  CreditCard, Coins, Check, Calculator, AlertTriangle, 
  TrendingUp, ArrowRightLeft 
} from 'lucide-react';

interface CashierPanelProps {
  cashierUser: Employee;
  storeInfo: StoreInfo;
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  onCloseOrder: (
    orderId: string, 
    paymentMethod: 'pix' | 'card' | 'cash', 
    discount: number, 
    serviceCharge: number, 
    total: number
  ) => void;
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
  
  // Estado para responsividade
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Estados para cálculos do fechamento
  const [applyServiceCharge, setApplyServiceCharge] = useState(true);
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash' | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Estados para cálculo de troco (Dinheiro)
  const [cashAmountPaid, setCashAmountPaid] = useState('');

  // Apenas ordens ativas
  const activeOrders = orders.filter(o => o.status === 'active');
  const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);

  // Cálculos financeiros do pedido selecionado
  const subtotal = selectedOrder ? selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
  const serviceCharge = applyServiceCharge ? (subtotal * (storeInfo.serviceChargePercent / 100)) : 0;
  const discount = Number(discountInput) || 0;
  const total = Math.max(0, subtotal + serviceCharge - discount);

  // Cálculo do Troco
  const paidAmount = Number(cashAmountPaid) || 0;
  const changeToReturn = paidAmount > total ? (paidAmount - total) : 0;

  // Cômputo do fechamento de caixa do dia atual
  const getTodayCashFlow = () => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const closedOrdersToday = orders.filter(o => 
      o.status === 'completed' && 
      o.completedAt && 
      new Date(o.completedAt).toLocaleDateString('pt-BR') === todayStr
    );

    return closedOrdersToday.reduce(
      (acc, order) => {
        const val = order.total || 0;
        if (order.paymentMethod === 'pix') acc.pix += val;
        if (order.paymentMethod === 'card') acc.card += val;
        if (order.paymentMethod === 'cash') acc.cash += val;
        acc.total += val;
        return acc;
      },
      { pix: 0, card: 0, cash: 0, total: 0 }
    );
  };

  const todayCashFlow = getTodayCashFlow();

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setPaymentMethod(null);
    setDiscountInput('');
    setCashAmountPaid('');
    setShowReceipt(false);
  };

  const handleCloseTable = () => {
    if (!selectedOrder || !paymentMethod) return;
    
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
    setCashAmountPaid('');
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
        
        {/* Painel de Faturamento Diário do Caixa */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total PIX hoje</span>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-dark)' }}>R$ {todayCashFlow.pix.toFixed(2)}</h4>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--secondary)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Cartão hoje</span>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>R$ {todayCashFlow.card.toFixed(2)}</h4>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--accent)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Dinheiro hoje</span>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>R$ {todayCashFlow.cash.toFixed(2)}</h4>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--success)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fechamento Geral</span>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>R$ {todayCashFlow.total.toFixed(2)}</h4>
          </div>
        </div>

        <div className="cashier-layout">
          
          {/* Coluna Esquerda: Lista de Mesas Ativas */}
          {(!isMobile || !selectedOrderId) && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Contas Ativas</h2>
              
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
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Sem Contas Pendentes</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma mesa ativa consumindo no momento.</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '1rem'
                }}>
                  {activeOrders.map(order => {
                    const orderSum = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                    const isSelected = order.id === selectedOrderId;
                    const allDelivered = order.items.length > 0 && order.items.every(i => i.status === 'delivered');
                    
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
                          Garçom: {order.waiterName.split(' ')[0]}
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
          )}

          {/* Coluna Direita: Detalhamento de Conta Selecionada */}
          {(!isMobile || selectedOrderId) && (
            <div>
              {selectedOrder ? (
                <div className="bill-details glass-panel">
                  {/* Botão de Voltar no Mobile */}
                  {isMobile && (
                    <button 
                      onClick={() => setSelectedOrderId(null)}
                      className="btn btn-outline"
                      style={{
                        marginBottom: '1rem',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        borderRadius: '10px',
                        width: 'fit-content',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ← Voltar para Contas
                    </button>
                  )}
                  
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
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span className="form-label" style={{ marginBottom: '0.5rem' }}>Meio de Pagamento</span>
                    
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

                  {/* Calculadora de Troco (Dinheiro) */}
                  {paymentMethod === 'cash' && (
                    <div className="glass-panel" style={{
                      padding: '1rem',
                      marginBottom: '1.25rem',
                      background: '#fdfbf7',
                      border: '1px solid var(--accent-light)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <ArrowRightLeft size={16} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>Calculadora de Troco</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valor Pago:</span>
                        <input 
                          type="number" 
                          placeholder="R$ 0,00" 
                          className="form-control"
                          style={{ width: '110px', padding: '4px 8px', fontSize: '0.85rem', textAlign: 'right' }}
                          value={cashAmountPaid}
                          onChange={e => setCashAmountPaid(e.target.value)}
                        />
                      </div>

                      {paidAmount > 0 && (
                        <div className="flex-between" style={{ marginTop: '10px', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Troco a devolver:</span>
                          <strong style={{ fontSize: '1.1rem', color: paidAmount >= total ? 'var(--success)' : 'var(--danger)' }}>
                            {paidAmount >= total ? `R$ ${changeToReturn.toFixed(2)}` : 'Valor insuficiente'}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Simulação de PIX QR Code */}
                  {paymentMethod === 'pix' && (
                    <div className="glass-panel" style={{
                      padding: '1rem',
                      marginBottom: '1.25rem',
                      textAlign: 'center',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>⚡ PIX Gerado (Copia e Cola)</span>
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
                      <textarea 
                        readOnly 
                        value={`00020101021226850014br.gov.pix0136ttmtkktnkzwlkjteiard@supabase.co5204000053039865405${total.toFixed(2)}5802BR5914MaestriaBeach6008Fortaleza62070503***6304FC3A`}
                        style={{
                          width: '100%',
                          fontSize: '0.55rem',
                          fontFamily: 'monospace',
                          color: 'var(--text-muted)',
                          padding: '4px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          resize: 'none',
                          height: '40px'
                        }}
                      />
                    </div>
                  )}

                  {/* Ações */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => setShowReceipt(true)}
                      className="btn btn-outline"
                      style={{ width: '100%', borderRadius: '12px' }}
                    >
                      <Receipt size={16} /> Ver Recibo Digital
                    </button>
                    
                    <button
                      onClick={handleCloseTable}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', gap: '0.5rem', borderRadius: '12px' }}
                      disabled={!paymentMethod || (paymentMethod === 'cash' && paidAmount < total)}
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
          )}

        </div>
      </main>

      {/* MODAL: RECIBO DIGITAL */}
      {showReceipt && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', fontFamily: 'monospace', borderRadius: '16px' }}>
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
              <button onClick={() => setShowReceipt(false)} className="btn btn-primary" style={{ width: '100%', borderRadius: '12px' }}>Ok, Fechar Recibo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
