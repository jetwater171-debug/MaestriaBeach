import React, { useState } from 'react';
import { Employee, StoreInfo } from '../types';
import { loginOwner, loginEmployee, registerNewStore } from '../supabaseService';
import { ShieldAlert, Sparkles, KeyRound, Mail, Store, User, PlusCircle, Check } from 'lucide-react';

interface LoginProps {
  employees: Employee[];
  onLoginSuccess: (
    employee: Employee, 
    selectedRoleOverride?: 'owner' | 'waiter' | 'kitchen' | 'cashier',
    storeInfo?: StoreInfo,
    storeId?: string
  ) => void;
  storeName: string;
}

type AccessMode = 'staff' | 'owner' | 'register';

export const Login: React.FC<LoginProps> = ({ employees, onLoginSuccess, storeName }) => {
  const [mode, setMode] = useState<AccessMode>('staff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para Login de Equipe
  const [tenantCode, setTenantCode] = useState('');
  const [pin, setPin] = useState('');

  // Estados para Login de Dono
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // Estados para Onboarding (Nova Barraca)
  const [newStoreName, setNewStoreName] = useState('');
  const [newTenantCode, setNewTenantCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [codeMode, setCodeMode] = useState<'custom' | 'auto'>('custom');

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MB';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Teclado virtual do PIN
  const handlePinPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmitStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!tenantCode) {
      setError('Por favor, informe o Código da Barraca.');
      return;
    }
    if (pin.length !== 4) {
      setError('O PIN do funcionário deve ter 4 dígitos.');
      return;
    }

    setLoading(true);
    // Tenta autenticar pelo Supabase
    const result = await loginEmployee(tenantCode, pin);
    setLoading(false);

    if (result) {
      onLoginSuccess(result.employee, undefined, result.store, result.storeId);
    } else {
      // Fallback para LocalStorage se o Supabase não estiver ativado ou falhar
      // Para simular offline:
      const localStoreInfo = JSON.parse(localStorage.getItem('mb_store_info') || '{}');
      const isLocalStore = tenantCode.toUpperCase() === 'MAES01' || tenantCode.toUpperCase() === localStoreInfo.tenantCode;
      const localEmployee = employees.find(emp => emp.pin === pin);
      
      if (isLocalStore && localEmployee) {
        onLoginSuccess(localEmployee, undefined, localStoreInfo, 'local');
      } else {
        setError('Barraca ou PIN incorretos. Tente MAES01 e PIN 1234.');
        setPin('');
      }
    }
  };

  const handleSubmitOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ownerEmail || !ownerPassword) {
      setError('Preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    const result = await loginOwner(ownerEmail, ownerPassword);
    setLoading(false);

    if (result) {
      onLoginSuccess(result.employee, 'owner', result.store, result.storeId);
    } else {
      // Fallback offline
      if (ownerEmail === 'dono@maestria.com' && ownerPassword === 'admin') {
        const localStoreInfo = JSON.parse(localStorage.getItem('mb_store_info') || '{}');
        const ownerEmp = employees.find(emp => emp.pin === '0000') || {
          id: 'e1',
          name: 'Dono (Administrador)',
          role: 'cashier',
          pin: '0000'
        };
        onLoginSuccess(ownerEmp as Employee, 'owner', localStoreInfo, 'local');
      } else {
        setError('E-mail ou senha do administrador incorretos.');
      }
    }
  };

  const handleRegisterStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newStoreName || !newTenantCode || !newEmail || !newPassword) {
      setError('Por favor, preencha todos os campos do cadastro.');
      return;
    }

    if (newTenantCode.length < 3) {
      setError('O código da barraca deve ter no mínimo 3 caracteres.');
      return;
    }

    setLoading(true);
    const result = await registerNewStore(newStoreName, newTenantCode, newEmail, newPassword);
    setLoading(false);

    if (result) {
      alert(`Barraca "${newStoreName}" cadastrada com sucesso! Código de acesso: ${newTenantCode.toUpperCase()}`);
      onLoginSuccess(result.employee, 'owner', result.store, result.storeId);
    } else {
      setError('Falha ao registrar barraca. O código ou e-mail pode já estar em uso.');
    }
  };

  // Dispara submit automático do PIN ao digitar 4 números
  React.useEffect(() => {
    if (pin.length === 4) {
      handleSubmitStaff();
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
        maxWidth: '440px',
        padding: '2.5rem 2rem',
        border: '1px solid rgba(255, 255, 255, 0.7)'
      }}>
        {/* Cabeçalho da Identidade */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
            marginBottom: '0.75rem'
          }}>
            🏖️
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            Maestria Beach
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Gestão Premium de Quiosques & Barracas
          </p>
        </div>

        {/* Seleção de Abas */}
        {mode !== 'register' && (
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(226, 232, 240, 0.5)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '1.5rem'
          }}>
            <button
              onClick={() => { setMode('staff'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: mode === 'staff' ? 'white' : 'transparent',
                color: mode === 'staff' ? 'var(--primary-dark)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: mode === 'staff' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              💼 Sou Equipe
            </button>
            <button
              onClick={() => { setMode('owner'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: mode === 'owner' ? 'white' : 'transparent',
                color: mode === 'owner' ? 'var(--primary-dark)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: mode === 'owner' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              👑 Sou Dono
            </button>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--danger)',
            backgroundColor: 'var(--danger-light)',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1.25rem'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* MODO 1: LOGIN DE EQUIPE (Mesa / Celular) */}
        {mode === 'staff' && (
          <form onSubmit={handleSubmitStaff}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Código da Barraca</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: MAES01"
                  style={{ textTransform: 'uppercase', paddingLeft: '2.25rem' }}
                  value={tenantCode}
                  onChange={e => setTenantCode(e.target.value)}
                  disabled={loading}
                  required
                />
                <Store size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>PIN do Funcionário (4 dígitos)</label>
              
              {/* Pontinhos do PIN */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '1rem 0' }}>
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: pin.length > index ? 'var(--primary)' : 'rgba(148, 163, 184, 0.3)',
                      transition: 'all 0.15s ease',
                      transform: pin.length > index ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>

              {/* Teclado Virtual PIN */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                maxWidth: '300px',
                margin: '0 auto'
              }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinPress(num)}
                    disabled={loading}
                    className="scale-up"
                    style={{
                      padding: '0.85rem',
                      fontSize: '1.2rem',
                      fontWeight: '700',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  disabled={loading}
                  style={{
                    padding: '0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    color: 'var(--danger)',
                    cursor: 'pointer'
                  }}
                >
                  Apagar
                </button>
                <button
                  type="button"
                  onClick={() => handlePinPress('0')}
                  disabled={loading}
                  className="scale-up"
                  style={{
                    padding: '0.85rem',
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  0
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(14, 165, 233, 0.2)'
                  }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* MODO 2: LOGIN DO DONO */}
        {mode === 'owner' && (
          <form onSubmit={handleSubmitOwner}>
            <div className="form-group">
              <label className="form-label">E-mail Administrativo</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-control"
                  placeholder="dono@barraca.com"
                  style={{ paddingLeft: '2.25rem' }}
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Sua senha secreta"
                  style={{ paddingLeft: '2.25rem' }}
                  value={ownerPassword}
                  onChange={e => setOwnerPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', gap: '8px' }}
              disabled={loading}
            >
              <KeyRound size={18} /> {loading ? 'Autenticando...' : 'Entrar no Painel do Dono'}
            </button>
          </form>
        )}

        {/* MODO 3: CADASTRO DE NOVA BARRACA (ONBOARDING) */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterStore}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={20} /> Cadastre sua Barraca de Praia
            </h3>

            <div className="form-group">
              <label className="form-label">Nome da Barraca / Loja</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Barraca Maresia Club"
                value={newStoreName}
                onChange={e => setNewStoreName(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Código de Acesso da Equipe</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCodeMode('custom');
                    setNewTenantCode('');
                  }}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid ' + (codeMode === 'custom' ? 'var(--primary)' : 'var(--border-color)'),
                    backgroundColor: codeMode === 'custom' ? 'var(--primary-light)' : 'white',
                    color: codeMode === 'custom' ? 'var(--primary-dark)' : 'var(--text-muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ✍️ Escolher Meu Código
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCodeMode('auto');
                    setNewTenantCode(generateRandomCode());
                  }}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid ' + (codeMode === 'auto' ? 'var(--primary)' : 'var(--border-color)'),
                    backgroundColor: codeMode === 'auto' ? 'var(--primary-light)' : 'white',
                    color: codeMode === 'auto' ? 'var(--primary-dark)' : 'var(--text-muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🎲 Gerar Automático
                </button>
              </div>

              <input
                type="text"
                className="form-control"
                placeholder={codeMode === 'custom' ? "Ex: MARE02 (letras e números)" : "Código Gerado"}
                style={{
                  textTransform: 'uppercase',
                  fontWeight: codeMode === 'auto' ? 'bold' : 'normal',
                  textAlign: codeMode === 'auto' ? 'center' : 'left',
                  letterSpacing: codeMode === 'auto' ? '2px' : 'normal'
                }}
                maxLength={8}
                value={newTenantCode}
                onChange={e => {
                  if (codeMode === 'custom') {
                    setNewTenantCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                  }
                }}
                disabled={loading || codeMode === 'auto'}
                required
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {codeMode === 'custom'
                  ? 'Seus funcionários digitarão este código no celular para logar.'
                  : `Guarde este código gerado: ${newTenantCode}`}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail do Proprietário</label>
              <input
                type="email"
                className="form-control"
                placeholder="Ex: dono@maresia.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Senha de Acesso</label>
              <input
                type="password"
                className="form-control"
                placeholder="Crie uma senha forte"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setMode('staff'); setError(''); }}
                className="btn btn-outline"
                style={{ flex: 1, borderRadius: '12px' }}
                disabled={loading}
              >
                Voltar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, borderRadius: '12px', gap: '6px' }}
                disabled={loading}
              >
                <Check size={16} /> {loading ? 'Cadastrando...' : 'Criar Barraca'}
              </button>
            </div>
          </form>
        )}

        {/* Rodapé de Registro */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.85rem'
        }}>
          {mode !== 'register' ? (
            <span style={{ color: 'var(--text-muted)' }}>
              É proprietário e quer usar na sua praia?{' '}
              <button
                onClick={() => { setMode('register'); setError(''); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Cadastre sua barraca aqui!
              </button>
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>
              Já tem cadastro?{' '}
              <button
                onClick={() => { setMode('staff'); setError(''); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Faça login
              </button>
            </span>
          )}
        </div>

        {/* Demonstração rápida dos acessos */}
        {mode === 'staff' && (
          <div style={{
            backgroundColor: 'rgba(254, 243, 199, 0.5)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '1.5rem',
            textAlign: 'left'
          }}>
            <h4 style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.4rem'
            }}>
              <Sparkles size={14} /> Dados para Teste (Loja Padrão)
            </h4>
            <ul style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              listStyle: 'none',
              paddingLeft: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <li>🏢 <strong>Código da Barraca:</strong> <code>MAES01</code></li>
              <li>🔑 <strong>Dono (Admin):</strong> PIN <code>0000</code> ou e-mail <code>dono@maestria.com</code> / senha <code>admin</code></li>
              <li>🔑 <strong>Garçom Carlos:</strong> PIN <code>1234</code></li>
              <li>🔑 <strong>Cozinha Chef:</strong> PIN <code>1111</code></li>
              <li>🔑 <strong>Caixa Sandra:</strong> PIN <code>2222</code></li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
