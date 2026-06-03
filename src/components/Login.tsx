import React, { useState } from 'react';
import { Employee } from '../types';
import { KeyRound, ShieldAlert, Sparkles, ClipboardList } from 'lucide-react';

interface LoginProps {
  employees: Employee[];
  onLoginSuccess: (employee: Employee, selectedRoleOverride?: 'owner' | 'waiter' | 'kitchen' | 'cashier') => void;
  storeName: string;
}

export const Login: React.FC<LoginProps> = ({ employees, onLoginSuccess, storeName }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (pin.length !== 4) {
      setError('O PIN deve conter exatamente 4 dígitos.');
      return;
    }

    // Caso especial para login direto do Dono
    if (pin === '0000') {
      const ownerEmp = employees.find(emp => emp.pin === '0000') || {
        id: 'e1',
        name: 'Dono (Administrador)',
        role: 'cashier',
        pin: '0000'
      };
      onLoginSuccess(ownerEmp as Employee, 'owner');
      return;
    }

    const employee = employees.find(emp => emp.pin === pin);
    if (employee) {
      onLoginSuccess(employee);
    } else {
      setError('PIN inválido. Verifique o código e tente novamente.');
      setPin('');
    }
  };

  // Se o PIN atingir 4 dígitos, envia automaticamente
  React.useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'var(--bg-gradient)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.7)'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white',
            fontSize: '2rem',
            boxShadow: '0 8px 20px rgba(14, 165, 233, 0.25)',
            marginBottom: '1rem'
          }}>
            🏖️
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            {storeName}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Sistema Geral Maestria Beach
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              margin: '1.5rem 0'
            }}>
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: pin.length > index ? 'var(--primary)' : 'rgba(148, 163, 184, 0.3)',
                    transition: 'all 0.15s ease',
                    transform: pin.length > index ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: pin.length > index ? '0 0 8px var(--primary)' : 'none'
                  }}
                />
              ))}
            </div>
            
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                color: 'var(--danger)',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginTop: '0.5rem'
              }}>
                <ShieldAlert size={14} />
                {error}
              </div>
            )}
          </div>

          {/* Teclado Numérico Customizado */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '1.5rem'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="scale-up"
                style={{
                  padding: '1rem',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'white',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  fontFamily: 'var(--font-title)'
                }}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              style={{
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontFamily: 'var(--font-title)'
              }}
            >
              Apagar
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="scale-up"
              style={{
                padding: '1rem',
                fontSize: '1.25rem',
                fontWeight: '700',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'white',
                color: 'var(--text-main)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                fontFamily: 'var(--font-title)'
              }}
            >
              0
            </button>
            <button
              type="submit"
              style={{
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: '700',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'var(--primary)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(14, 165, 233, 0.2)',
                fontFamily: 'var(--font-title)'
              }}
            >
              Entrar
            </button>
          </div>
        </form>

        {/* Guia de Acesso para Testador/Cliente */}
        <div style={{
          backgroundColor: 'rgba(254, 243, 199, 0.5)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '1rem',
          textAlign: 'left'
        }}>
          <h4 style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Sparkles size={16} /> PINs de Acesso Rápido (Demonstração)
          </h4>
          <ul style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            listStyle: 'none',
            paddingLeft: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <li>🔑 <strong>0000</strong> - Painel do Dono (Admin Geral)</li>
            <li>🔑 <strong>1234</strong> - Garçom: Carlos Santos</li>
            <li>🔑 <strong>5678</strong> - Garçom: Mariana Souza</li>
            <li>🔑 <strong>1111</strong> - Cozinha: Chef Bahia</li>
            <li>🔑 <strong>2222</strong> - Caixa: Sandra Silva</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
