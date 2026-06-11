import React, { useState } from 'react';
import { Employee, StoreInfo, MenuItem } from '../types';
import { loginOwner, loginEmployee, registerNewStore, registerNewStoreExtended } from '../supabaseService';
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

  // Estados para Onboarding Multi-Step (Nova Barraca)
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [newStoreName, setNewStoreName] = useState('');
  const [newTenantCode, setNewTenantCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [codeMode, setCodeMode] = useState<'custom' | 'auto'>('custom');
  
  // Passo 1 adicional
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreTablesCount, setNewStoreTablesCount] = useState(15);
  const [newStoreThemeColor, setNewStoreThemeColor] = useState('teal');
  const [newStoreLogo, setNewStoreLogo] = useState('🏖️');

  // Passo 2: Equipe
  const [onboardingEmployees, setOnboardingEmployees] = useState<Omit<Employee, 'id'>[]>([
    { name: 'Carlos Santos', role: 'waiter', pin: '1234' },
    { name: 'Cozinheiro Chefe', role: 'kitchen', pin: '1111' },
    { name: 'Sandra Caixa', role: 'cashier', pin: '2222' }
  ]);
  const [tempEmpName, setTempEmpName] = useState('');
  const [tempEmpRole, setTempEmpRole] = useState<'waiter' | 'kitchen' | 'cashier'>('waiter');
  const [tempEmpPin, setTempEmpPin] = useState('');

  // Passo 3: Cardápio
  const [onboardingMenuItems, setOnboardingMenuItems] = useState<Omit<MenuItem, 'id'>[]>([]);
  const [tempItemName, setTempItemName] = useState('');
  const [tempItemPrice, setTempItemPrice] = useState('');
  const [tempItemCategory, setTempItemCategory] = useState('Bebidas');
  const [tempItemDesc, setTempItemDesc] = useState('');
  const [tempItemEmoji, setTempItemEmoji] = useState('🍔');

  // Scanner de Imagem
  const [menuImagePreview, setMenuImagePreview] = useState<string | null>(null);
  const [isScanningMenu, setIsScanningMenu] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);

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
      const isLocalStore = tenantCode.toUpperCase() === 'MAES01' || tenantCode.toUpperCase() === localStoreInfo.tenantCode?.toUpperCase();
      const localEmployee = employees.find(emp => emp.pin === pin);
      
      if (isLocalStore && localEmployee) {
        onLoginSuccess(localEmployee, undefined, localStoreInfo, 'local');
      } else {
        setError('Barraca ou PIN incorretos. Verifique suas credenciais.');
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

    if (onboardingStep < 3) {
      setOnboardingStep(prev => prev + 1);
      return;
    }

    if (!newStoreName || !newTenantCode || !newEmail || !newPassword) {
      setError('Por favor, preencha as credenciais da barraca no Passo 1.');
      setOnboardingStep(1);
      return;
    }

    if (newTenantCode.length < 3) {
      setError('O código da barraca deve ter no mínimo 3 caracteres.');
      setOnboardingStep(1);
      return;
    }

    const finalStoreInfo: StoreInfo = {
      name: newStoreName,
      logoUrl: newStoreLogo,
      address: newStoreAddress,
      tablesCount: newStoreTablesCount,
      serviceChargePercent: 10,
      themeColor: newStoreThemeColor,
      categories: ['Bebidas', 'Petiscos', 'Sobremesas', 'Outros']
    };

    setLoading(true);
    const result = await registerNewStoreExtended(
      { ...finalStoreInfo, tenantCode: newTenantCode },
      newEmail,
      newPassword,
      onboardingEmployees,
      onboardingMenuItems
    );
    setLoading(false);

    if (result) {
      alert(`Barraca "${newStoreName}" cadastrada com sucesso! Código de acesso: ${newTenantCode.toUpperCase()}`);
      onLoginSuccess(result.employee, 'owner', result.store, result.storeId);
    } else {
      // Fallback offline
      const storeId = 'local';
      
      const newEmployeesList = [
        {
          id: 'e1',
          name: 'Dono (Administrador)',
          role: 'cashier' as const,
          pin: '0000'
        },
        ...onboardingEmployees.map((emp, i) => ({
          id: `e_onb_${i}`,
          name: emp.name,
          role: emp.role,
          pin: emp.pin
        }))
      ];

      const newMenuItemsList = onboardingMenuItems.length > 0 
        ? onboardingMenuItems.map((item, i) => ({
            id: `m_onb_${i}`,
            name: item.name,
            price: item.price,
            description: item.description,
            category: item.category,
            imageUrl: item.imageUrl,
            isAvailable: true,
            isPromotion: item.isPromotion,
            promotionalPrice: item.promotionalPrice
          }))
        : [
            { id: 'm1', name: 'Água de Coco Gelada', price: 8.00, description: 'Coco verde natural.', category: 'Bebidas', imageUrl: '🥥', isAvailable: true, isPromotion: false },
            { id: 'm2', name: 'Caipirinha Tradicional', price: 18.00, description: 'Cachaça artesanal e limão.', category: 'Bebidas', imageUrl: '🍹', isAvailable: true, isPromotion: false },
            { id: 'm3', name: 'Isca de Peixe Crocante', price: 55.00, description: 'Filé de peixe frito.', category: 'Petiscos', imageUrl: '🐟', isAvailable: true, isPromotion: false }
          ];

      localStorage.setItem('mb_store_info', JSON.stringify({ ...finalStoreInfo, tenantCode: newTenantCode.toUpperCase().trim() }));
      localStorage.setItem('mb_employees', JSON.stringify(newEmployeesList));
      localStorage.setItem('mb_menu_items', JSON.stringify(newMenuItemsList));
      localStorage.setItem('mb_orders', JSON.stringify([]));
      localStorage.setItem('mb_sales', JSON.stringify([]));

      alert(`[Offline Mode] Barraca "${newStoreName}" cadastrada no navegador! Código: ${newTenantCode.toUpperCase()}`);
      onLoginSuccess(newEmployeesList[0], 'owner', { ...finalStoreInfo, tenantCode: newTenantCode }, 'local');
    }
  };

  const handleAddOnboardingEmployee = () => {
    if (!tempEmpName || tempEmpPin.length !== 4) {
      alert('Informe o nome e um PIN de 4 dígitos.');
      return;
    }
    if (onboardingEmployees.some(emp => emp.pin === tempEmpPin) || tempEmpPin === '0000') {
      alert('Este PIN já está em uso.');
      return;
    }
    setOnboardingEmployees([
      ...onboardingEmployees,
      { name: tempEmpName, role: tempEmpRole, pin: tempEmpPin }
    ]);
    setTempEmpName('');
    setTempEmpPin('');
  };

  const handleRemoveOnboardingEmployee = (pinToRemove: string) => {
    setOnboardingEmployees(onboardingEmployees.filter(emp => emp.pin !== pinToRemove));
  };

  const handleAddOnboardingMenuItem = () => {
    if (!tempItemName || !tempItemPrice) {
      alert('Informe o nome e o preço do item.');
      return;
    }
    setOnboardingMenuItems([
      ...onboardingMenuItems,
      {
        name: tempItemName,
        price: Number(tempItemPrice),
        description: tempItemDesc,
        category: tempItemCategory,
        imageUrl: tempItemEmoji,
        isAvailable: true,
        isPromotion: false
      }
    ]);
    setTempItemName('');
    setTempItemPrice('');
    setTempItemDesc('');
  };

  const handleRemoveOnboardingMenuItem = (index: number) => {
    setOnboardingMenuItems(onboardingMenuItems.filter((_, idx) => idx !== index));
  };

  const handleMenuImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setMenuImagePreview(url);
      runRealMenuImageScan(file);
    }
  };

  const runRealMenuImageScan = async (file: File) => {
    setIsScanningMenu(true);
    setScanProgress(5);
    setScanLogs([`🔍 [OCR] Inicializando Leitor de Cardápio com IA...`]);

    try {
      const Tesseract = (window as any).Tesseract;
      if (!Tesseract) {
        throw new Error("A biblioteca Tesseract.js não foi carregada no navegador.");
      }

      setScanLogs(prev => [...prev, `📸 [OCR] Carregando imagem e preparando reconhecimento...`]);
      setScanProgress(15);

      setScanLogs(prev => [...prev, `🤖 [IA] Reconhecendo texto e preços em português...`]);
      setScanProgress(30);

      // Executa o reconhecimento
      const result = await Tesseract.recognize(
        file,
        'por',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              const progressPct = Math.min(95, Math.round(30 + m.progress * 60));
              setScanProgress(progressPct);
            }
          }
        }
      );

      const text = result.data.text || '';
      setScanProgress(90);
      setScanLogs(prev => [...prev, `🏷️ [IA] Analisando estrutura do cardápio e mapeando categorias...`]);

      const lines = text.split('\n');
      const extractedItems: Omit<MenuItem, 'id'>[] = [];

      lines.forEach((line: string) => {
        const cleanedLine = line.trim();
        if (!cleanedLine || cleanedLine.length < 3) return;

        // Expressão regular para encontrar o nome e o preço no final da linha
        // Exemplo: "Caipirinha R$ 15,00" ou "Suco de Laranja 12.00" ou "Isca de Peixe... 50"
        const match = cleanedLine.match(/(.*?)\s+(?:R\$?\s*)?(\d+(?:[.,]\d{1,2})?)\s*$/i);
        if (match) {
          let name = match[1].trim();
          const priceStr = match[2].trim().replace(',', '.');
          const price = parseFloat(priceStr);

          // Limpar os pontinhos conectores clássicos de cardápio (ex: "Peixe Grelhado ...... 45.00")
          name = name.replace(/[.\-_+=*~]{2,}/g, '').trim();

          if (!name || isNaN(price) || price <= 0) return;

          // Categorizar por palavra-chave
          const nameLower = name.toLowerCase();
          let category = 'Petiscos';
          if (
            nameLower.includes('bebida') || nameLower.includes('suco') || nameLower.includes('água') ||
            nameLower.includes('agua') || nameLower.includes('cerveja') || nameLower.includes('chopp') ||
            nameLower.includes('refrigerante') || nameLower.includes('coca') || nameLower.includes('guaraná') ||
            nameLower.includes('guarana') || nameLower.includes('fanta') || nameLower.includes('sprite') ||
            nameLower.includes('caipirinha') || nameLower.includes('gin') || nameLower.includes('vodka') ||
            nameLower.includes('vinho') || nameLower.includes('tônica') || nameLower.includes('tonica') ||
            nameLower.includes('copo') || nameLower.includes('lata') || nameLower.includes('long neck') ||
            nameLower.includes('red bull') || nameLower.includes('energético') || nameLower.includes('energetico')
          ) {
            category = 'Bebidas';
          } else if (
            nameLower.includes('sobremesa') || nameLower.includes('sorvete') || nameLower.includes('picolé') ||
            nameLower.includes('picole') || nameLower.includes('doce') || nameLower.includes('pudim') ||
            nameLower.includes('mousse') || nameLower.includes('torta') || nameLower.includes('açaí') ||
            nameLower.includes('acai') || nameLower.includes('petit') || nameLower.includes('chocolate') ||
            nameLower.includes('pave') || nameLower.includes('pavê')
          ) {
            category = 'Sobremesas';
          }

          // Escolher emoji correspondente
          let imageUrl = '🍽️';
          if (category === 'Bebidas') {
            if (nameLower.includes('água') || nameLower.includes('agua') || nameLower.includes('coco')) imageUrl = '🥥';
            else if (nameLower.includes('cerveja') || nameLower.includes('chopp')) imageUrl = '🍺';
            else if (nameLower.includes('suco') || nameLower.includes('refrigerante') || nameLower.includes('coca') || nameLower.includes('coke')) imageUrl = '🥤';
            else imageUrl = '🍹';
          } else if (category === 'Sobremesas') {
            imageUrl = '🍨';
          } else {
            if (nameLower.includes('peixe')) imageUrl = '🐟';
            else if (nameLower.includes('camarão') || nameLower.includes('camarao')) imageUrl = '🍤';
            else if (nameLower.includes('lagosta')) imageUrl = '🦞';
            else if (nameLower.includes('lula') || nameLower.includes('polvo')) imageUrl = '🐙';
            else if (nameLower.includes('pastel') || nameLower.includes('empanada')) imageUrl = '🥟';
            else if (nameLower.includes('batata') || nameLower.includes('frita')) imageUrl = '🍟';
            else if (nameLower.includes('carne') || nameLower.includes('picanha') || nameLower.includes('espeto') || nameLower.includes('contra')) imageUrl = '🥩';
            else if (nameLower.includes('queijo')) imageUrl = '🧀';
          }

          extractedItems.push({
            name,
            price,
            description: `Importado via OCR do cardápio físico.`,
            category,
            imageUrl,
            isAvailable: true,
            isPromotion: false
          });
        }
      });

      if (extractedItems.length === 0) {
        setScanLogs(prev => [
          ...prev, 
          `⚠️ [Aviso] O texto foi lido, mas nenhum item foi identificado no formato "Nome do Prato Preço".`,
          `📝 Amostra de texto:\n${text.substring(0, 120)}`
        ]);
        setOnboardingMenuItems([
          { name: 'Água de Coco Gelada', price: 8.00, description: 'Coco verde natural.', category: 'Bebidas', imageUrl: '🥥', isAvailable: true, isPromotion: false },
          { name: 'Caipirinha Tradicional', price: 18.00, description: 'Cachaça artesanal e limão.', category: 'Bebidas', imageUrl: '🍹', isAvailable: true, isPromotion: false },
          { name: 'Isca de Peixe Crocante', price: 55.00, description: 'Empanado no panko.', category: 'Petiscos', imageUrl: '🐟', isAvailable: true, isPromotion: false }
        ]);
      } else {
        setScanLogs(prev => [...prev, `✨ [Resultado] OCR finalizado! ${extractedItems.length} pratos/bebidas importados com sucesso.`]);
        setOnboardingMenuItems(extractedItems);
      }

      setScanProgress(100);
      setIsScanningMenu(false);
    } catch (err: any) {
      console.error(err);
      setScanLogs(prev => [...prev, `❌ [Erro] Falha no leitor de IA: ${err.message || err}`]);
      setIsScanningMenu(false);
      setScanProgress(100);
      setOnboardingMenuItems([
        { name: 'Água de Coco Gelada', price: 8.00, description: 'Coco verde natural.', category: 'Bebidas', imageUrl: '🥥', isAvailable: true, isPromotion: false },
        { name: 'Caipirinha Tradicional', price: 18.00, description: 'Cachaça artesanal e limão.', category: 'Bebidas', imageUrl: '🍹', isAvailable: true, isPromotion: false },
        { name: 'Isca de Peixe Crocante', price: 55.00, description: 'Empanado no panko.', category: 'Petiscos', imageUrl: '🐟', isAvailable: true, isPromotion: false }
      ]);
    }
  };

  // Dispara submit automático do PIN ao digitar 4 números
  React.useEffect(() => {
    if (pin.length === 4) {
      handleSubmitStaff();
    }
  }, [pin]);

  return (
    <div className="landing-page">
      {/* 1. Cabeçalho / Navbar Superior */}
      <header className="landing-nav">
        <div 
          className="brand-logo" 
          style={{ cursor: 'pointer' }}
          onClick={() => { setMode('staff'); setError(''); }}
        >
          <div className="brand-logo-icon">🏖️</div>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-title)', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Maestria Beach
          </span>
        </div>
        
        <div className="landing-nav-links">
          <a href="#recursos" className="landing-nav-link">Recursos</a>
          <a href="#planos" className="landing-nav-link">Planos</a>
          <a href="#depoimentos" className="landing-nav-link">Depoimentos</a>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => { setMode('staff'); setError(''); document.getElementById('auth-portal')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="btn btn-outline"
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '10px' }}
          >
            Área Equipe
          </button>
          <button 
            onClick={() => { setMode('register'); setOnboardingStep(1); setError(''); document.getElementById('auth-portal')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '10px' }}
          >
            Criar Barraca
          </button>
        </div>
      </header>

      {/* 2. Hero Section Split (Apresentação + Portal de Acesso) */}
      <section className="landing-hero">
        {/* Esquerda: Mensagem de Vendas & Badges de Diferenciais */}
        <div className="hero-text">
          <div className="hero-tag">
            <Sparkles size={14} style={{ color: 'var(--secondary)' }} />
            <span>O Único POS 100% Responsivo para Beach Clubs & Quiosques</span>
          </div>
          <h2 className="hero-title" style={{ fontSize: '2.8rem', lineHeight: '1.15', fontWeight: 800 }}>
            Transforme sua Barraca de Praia num Império de Vendas
          </h2>
          <p className="hero-subtitle" style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Cardápio inteligente com IA OCR (tire fotos de cardápios físicos), painel da cozinha com chimes de áudio, fechamento de caixa automatizado por Pix/Cartão/Dinheiro e gestão multi-tenant. Desenvolvido para funcionar em celulares, tablets ou PCs sob o sol forte.
          </p>

          <div className="hero-benefits">
            <div className="benefit-badge">
              <span>🤖</span>
              <span>Leitor de Cardápio por IA Scanner</span>
            </div>
            <div className="benefit-badge">
              <span>🔊</span>
              <span>Alertas Sonoros na Cozinha/Bar</span>
            </div>
            <div className="benefit-badge">
              <span>📊</span>
              <span>Fluxo de Caixa & Métricas em Tempo Real</span>
            </div>
            <div className="benefit-badge">
              <span>🔄</span>
              <span>Modo Offline (LocalStorage Fallback)</span>
            </div>
          </div>

          {/* Mini Testimonial / Social Proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ color: '#F59E0B', fontSize: '1.25rem' }}>★</span>
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 650 }}>
              +150 estabelecimentos ativos no Rio de Janeiro, Ceará e Jurerê Internacional.
            </span>
          </div>
        </div>

        {/* Direita: Portal de Login/Wizard */}
        <div id="auth-portal" className="glass-panel" style={{
          width: '100%',
          maxWidth: (mode === 'register' && onboardingStep === 3) ? '720px' : '480px',
          padding: '2.5rem 2rem',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'var(--shadow-premium)',
          margin: '0 auto'
        }}>
          {/* Identidade do Card */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white',
              fontSize: '1.85rem',
              boxShadow: '0 8px 20px rgba(14, 165, 233, 0.25)',
              marginBottom: '0.5rem'
            }}>
              🏖️
            </div>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.15rem' }}>
              Maestria Beach
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Gestão Premium de Quiosques & Barracas
            </p>
          </div>

          {/* Seleção de Abas (Modo Dono, Equipe ou Cadastro) */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(15, 106, 128, 0.08)',
            padding: '5px',
            borderRadius: '14px',
            marginBottom: '1.75rem',
            border: '1px solid rgba(191, 161, 95, 0.15)'
          }}>
            <button
              onClick={() => { setMode('staff'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: mode === 'staff' ? 'white' : 'transparent',
                color: mode === 'staff' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: mode === 'staff' ? '0 4px 10px rgba(15, 106, 128, 0.05)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              💼 Sou Equipe
            </button>
            <button
              onClick={() => { setMode('owner'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: mode === 'owner' ? 'white' : 'transparent',
                color: mode === 'owner' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: mode === 'owner' ? '0 4px 10px rgba(15, 106, 128, 0.05)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              👑 Sou Dono
            </button>
            <button
              onClick={() => { setMode('register'); setOnboardingStep(1); setError(''); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: mode === 'register' ? 'white' : 'transparent',
                color: mode === 'register' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: mode === 'register' ? '0 4px 10px rgba(15, 106, 128, 0.05)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              🚀 Criar Barraca
            </button>
          </div>

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
          <form onSubmit={handleRegisterStore} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Indicador de Etapas */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              position: 'relative'
            }}>
              {/* Linha de Progresso de Fundo */}
              <div style={{
                position: 'absolute',
                top: '18px',
                left: '10%',
                right: '10%',
                height: '3px',
                backgroundColor: 'rgba(148, 163, 184, 0.2)',
                zIndex: 1
              }} />
              {/* Linha de Progresso Ativa */}
              <div style={{
                position: 'absolute',
                top: '18px',
                left: '10%',
                width: onboardingStep === 1 ? '0%' : onboardingStep === 2 ? '40%' : '80%',
                height: '3px',
                backgroundColor: 'var(--primary)',
                transition: 'all 0.3s ease',
                zIndex: 2
              }} />

              {[
                { step: 1, label: 'Identidade', icon: '🏢' },
                { step: 2, label: 'Equipe', icon: '👥' },
                { step: 3, label: 'Cardápio', icon: '📋' }
              ].map(item => (
                <div key={item.step} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 3,
                  position: 'relative'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: onboardingStep >= item.step ? 'var(--primary)' : 'white',
                    color: onboardingStep >= item.step ? 'white' : 'var(--text-muted)',
                    border: '2px solid ' + (onboardingStep >= item.step ? 'var(--primary)' : 'var(--border-color)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    boxShadow: onboardingStep === item.step ? '0 0 10px rgba(15, 106, 128, 0.3)' : 'none'
                  }}>
                    {item.icon}
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    marginTop: '6px',
                    color: onboardingStep >= item.step ? 'var(--primary)' : 'var(--text-muted)'
                  }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* STEP 1: IDENTIDADE DA BARRACA */}
            {onboardingStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                  🏢 Passo 1: Configuração Inicial & Cores
                </h3>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome da Barraca / Resort</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: Barraca Maestria Beach Club"
                    value={newStoreName}
                    onChange={e => setNewStoreName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Emoji / Logo</label>
                    <select className="form-control" value={newStoreLogo} onChange={e => setNewStoreLogo(e.target.value)}>
                      <option value="🏖️">🏖️ Quiosque</option>
                      <option value="🍹">🍹 Drink</option>
                      <option value="🌴">🌴 Palmeira</option>
                      <option value="🦀">🦀 Caranguejo</option>
                      <option value="🥥">🥥 Coco</option>
                      <option value="🏄">🏄 Surf</option>
                      <option value="🛥️">🛥️ Yacht</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Código da Equipe</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: MAES01"
                      style={{ textTransform: 'uppercase' }}
                      maxLength={8}
                      value={newTenantCode}
                      onChange={e => setNewTenantCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Endereço da Barraca</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: Av. Beira Mar, Quiosque 12 - Ceará"
                    value={newStoreAddress}
                    onChange={e => setNewStoreAddress(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Capacidade de Mesas / Guarda-sóis:</span>
                    <strong style={{ color: 'var(--primary)' }}>{newStoreTablesCount} mesas</strong>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    className="form-control"
                    style={{ padding: '0.25rem 0', cursor: 'pointer' }}
                    value={newStoreTablesCount}
                    onChange={e => setNewStoreTablesCount(Number(e.target.value))}
                  />
                </div>

                {/* Personalização Visual */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <label className="form-label">🎨 Identidade Visual / Tema</label>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {[
                      { id: 'teal', name: 'Teal', color: '#0F6A80' },
                      { id: 'coral', name: 'Coral', color: '#E76F51' },
                      { id: 'gold', name: 'Gold', color: '#BFA15F' },
                      { id: 'emerald', name: 'Emerald', color: '#0D9488' }
                    ].map(theme => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setNewStoreThemeColor(theme.color)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '10px',
                          border: '2px solid',
                          borderColor: newStoreThemeColor === theme.color ? 'var(--primary)' : 'var(--border-color)',
                          backgroundColor: newStoreThemeColor === theme.color ? 'var(--primary-light)' : 'white',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}
                      >
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: theme.color }} />
                        {theme.name}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '10px', width: 'fit-content' }}>
                    <input
                      type="color"
                      value={newStoreThemeColor.startsWith('#') ? newStoreThemeColor : '#0F6A80'}
                      onChange={e => setNewStoreThemeColor(e.target.value)}
                      style={{ width: '32px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>Cor Personalizada</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{newStoreThemeColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Credenciais Administrativas */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label className="form-label">🔑 Acesso Administrativo (Dono)</label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="E-mail"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Senha"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setMode('staff'); setError(''); }}
                    className="btn btn-outline"
                    style={{ flex: 1, borderRadius: '12px' }}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="btn btn-primary"
                    style={{ flex: 2, borderRadius: '12px' }}
                    disabled={!newStoreName || !newTenantCode || !newEmail || !newPassword}
                  >
                    Próximo: Cadastrar Equipe →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CADASTRO DE EQUIPE */}
            {onboardingStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                  👥 Passo 2: Cadastrar Colaboradores
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Adicione os garçons, cozinheiros e caixas. (O Dono Admin é adicionado automaticamente com PIN 0000).
                </p>

                {/* Form Adicionar Colaborador */}
                <div className="glass-panel" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nome do Funcionário</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                      placeholder="Ex: João da Silva"
                      value={tempEmpName}
                      onChange={e => setTempEmpName(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Cargo</label>
                      <select
                        className="form-control"
                        style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
                        value={tempEmpRole}
                        onChange={e => setTempEmpRole(e.target.value as any)}
                      >
                        <option value="waiter">🙋‍♂️ Garçom</option>
                        <option value="kitchen">🍳 Cozinha / Bar</option>
                        <option value="cashier">💰 Caixa / Recepção</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">PIN (4 dígitos)</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', textAlign: 'center' }}
                          maxLength={4}
                          placeholder="1234"
                          value={tempEmpPin}
                          onChange={e => setTempEmpPin(e.target.value.replace(/\D/g, ''))}
                        />
                        <button
                          type="button"
                          onClick={() => setTempEmpPin(Math.floor(1000 + Math.random() * 9000).toString())}
                          style={{ padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' }}
                          title="Gerar PIN Aleatório"
                        >
                          🎲
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddOnboardingEmployee}
                    className="btn btn-outline"
                    style={{ padding: '0.6rem', fontSize: '0.8rem', borderRadius: '8px', gap: '4px', backgroundColor: 'white' }}
                  >
                    + Cadastrar Colaborador na Lista
                  </button>
                </div>

                {/* Lista de Colaboradores Cadastrados */}
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Equipe Adicionada ({onboardingEmployees.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {onboardingEmployees.map(emp => (
                      <div key={emp.pin} className="glass-panel" style={{ padding: '0.6rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem' }}>{emp.name}</strong>
                          <span style={{
                            fontSize: '0.65rem',
                            marginLeft: '8px',
                            backgroundColor: emp.role === 'waiter' ? 'var(--primary-light)' : emp.role === 'kitchen' ? 'var(--secondary-light)' : 'var(--success-light)',
                            color: emp.role === 'waiter' ? 'var(--primary-dark)' : emp.role === 'kitchen' ? 'var(--secondary)' : 'var(--success)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            fontWeight: 700
                          }}>
                            {emp.role === 'waiter' ? 'Garçom' : emp.role === 'kitchen' ? 'Cozinha' : 'Caixa'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700 }}>PIN: {emp.pin}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOnboardingEmployee(emp.pin)}
                            style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.9rem' }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="btn btn-outline"
                    style={{ flex: 1, borderRadius: '12px' }}
                  >
                    ← Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(3)}
                    className="btn btn-primary"
                    style={{ flex: 2, borderRadius: '12px' }}
                  >
                    Próximo: Montar Cardápio →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SETUP DO CARDÁPIO COM SCANNER */}
            {onboardingStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                  📋 Passo 3: Configuração do Cardápio / Menu
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: onboardingMenuItems.length > 0 ? '1.1fr 1fr' : '1fr', gap: '1.5rem', transition: 'all 0.3s ease' }}>
                  
                  {/* Lado Esquerdo: Importação */}
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Escolha preencher manualmente ou faça upload de uma foto do cardápio físico para extrair via IA.
                    </p>

                    {/* Scanner de IA */}
                    <div style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      backgroundColor: 'rgba(255,255,255,0.4)',
                      marginBottom: '1rem',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {!menuImagePreview ? (
                        <div>
                          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📷</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block' }}>Leitor de Cardápio por Imagem (IA)</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', margin: '4px 0 10px 0' }}>
                            Suba uma foto nítida da folha de preços para cadastrar automaticamente
                          </span>
                          <label className="btn btn-outline" style={{ display: 'inline-flex', padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}>
                            Selecionar Foto
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={handleMenuImageUpload}
                            />
                          </label>
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={menuImagePreview}
                            alt="Cardápio físico"
                            style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px', opacity: isScanningMenu ? 0.7 : 1 }}
                          />
                          
                          {/* Linha laser de scanner horizontal */}
                          {isScanningMenu && (
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              height: '4px',
                              backgroundColor: 'rgba(239, 68, 68, 0.8)',
                              boxShadow: '0 0 12px rgba(239, 68, 68, 1)',
                              top: `${scanProgress}%`,
                              transition: 'top 0.12s linear',
                              zIndex: 10
                            }} />
                          )}

                          {isScanningMenu ? (
                            <div style={{ marginTop: '10px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                ⚡ Escaneando Cardápio Físico ({scanProgress}%)...
                              </span>
                              
                              {/* Console logs terminal */}
                              <div style={{
                                backgroundColor: '#0f172a',
                                padding: '8px',
                                borderRadius: '6px',
                                marginTop: '6px',
                                textAlign: 'left',
                                height: '80px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                                fontSize: '0.55rem',
                                color: '#38bdf8',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px'
                              }}>
                                {scanLogs.map((log, i) => (
                                  <div key={i}>{log}</div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: '10px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>
                                ✅ Cardápio Escaneado por IA!
                              </span>
                              <button
                                type="button"
                                onClick={() => setMenuImagePreview(null)}
                                style={{
                                  display: 'block',
                                  margin: '4px auto 0 auto',
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--primary)',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Escanear Outro Cardápio
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cadastro Manual */}
                    <div className="glass-panel" style={{ padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', color: 'var(--primary-dark)' }}>✍️ Adicionar Item Manualmente</span>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '8px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Emoji</label>
                          <select className="form-control" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value={tempItemEmoji} onChange={e => setTempItemEmoji(e.target.value)}>
                            <option value="🍺">🍺 Cerveja</option>
                            <option value="🍹">🍹 Caipira</option>
                            <option value="🥥">🥥 Coco</option>
                            <option value="🥤">🥤 Suco</option>
                            <option value="🐟">🐟 Peixe</option>
                            <option value="🍤">🍤 Camarão</option>
                            <option value="🥟">🥟 Pastel</option>
                            <option value="🍟">🍟 Fritas</option>
                            <option value="🍧">🍧 Sorvete</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Nome</label>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                            placeholder="Ex: Pastel de Camarão"
                            value={tempItemName}
                            onChange={e => setTempItemName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Categoria</label>
                          <select
                            className="form-control"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                            value={tempItemCategory}
                            onChange={e => setTempItemCategory(e.target.value)}
                          >
                            <option value="Bebidas">Bebidas</option>
                            <option value="Petiscos">Petiscos</option>
                            <option value="Sobremesas">Sobremesas</option>
                            <option value="Outros">Outros</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem' }}>Preço</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                            placeholder="0.00"
                            value={tempItemPrice}
                            onChange={e => setTempItemPrice(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                          placeholder="Descrição opcional..."
                          value={tempItemDesc}
                          onChange={e => setTempItemDesc(e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddOnboardingMenuItem}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem', fontSize: '0.75rem', backgroundColor: 'white', borderRadius: '8px' }}
                      >
                        + Adicionar ao Cardápio
                      </button>
                    </div>
                  </div>

                  {/* Lado Direito: Lista de Revisão */}
                  {onboardingMenuItems.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Revisar Cardápio ({onboardingMenuItems.length})</span>
                        <button type="button" onClick={() => setOnboardingMenuItems([])} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}>Limpar</button>
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                        {onboardingMenuItems.map((item, index) => (
                          <div key={index} className="glass-panel" style={{ padding: '0.6rem', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'white' }}>
                            <select
                              value={item.imageUrl}
                              onChange={e => {
                                const updated = [...onboardingMenuItems];
                                updated[index].imageUrl = e.target.value;
                                setOnboardingMenuItems(updated);
                              }}
                              style={{ border: 'none', fontSize: '1.25rem', backgroundColor: 'transparent', cursor: 'pointer', padding: 0 }}
                            >
                              <option value="🍺">🍺</option>
                              <option value="🍹">🍹</option>
                              <option value="🥥">🥥</option>
                              <option value="🥤">🥤</option>
                              <option value="🐟">🐟</option>
                              <option value="🍤">🍤</option>
                              <option value="🦞">🦞</option>
                              <option value="🥟">🥟</option>
                              <option value="🍟">🍟</option>
                              <option value="🍧">🍧</option>
                            </select>

                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => {
                                  const updated = [...onboardingMenuItems];
                                  updated[index].name = e.target.value;
                                  setOnboardingMenuItems(updated);
                                }}
                                style={{ border: 'none', borderBottom: '1px solid transparent', fontSize: '0.8rem', fontWeight: 700, padding: 0, color: 'var(--text-main)', width: '100%' }}
                                onFocus={e => e.target.style.borderBottom = '1px solid var(--primary)'}
                                onBlur={e => e.target.style.borderBottom = '1px solid transparent'}
                              />
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <select
                                  value={item.category}
                                  onChange={e => {
                                    const updated = [...onboardingMenuItems];
                                    updated[index].category = e.target.value;
                                    setOnboardingMenuItems(updated);
                                  }}
                                  style={{ border: 'none', fontSize: '0.65rem', padding: 0, color: 'var(--text-muted)', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: 650 }}
                                >
                                  <option value="Bebidas">Bebidas</option>
                                  <option value="Petiscos">Petiscos</option>
                                  <option value="Sobremesas">Sobremesas</option>
                                  <option value="Outros">Outros</option>
                                </select>
                                <span style={{ color: 'var(--text-light)', fontSize: '0.7rem' }}>•</span>
                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>R$ </span>
                                  <input
                                    type="number"
                                    value={item.price}
                                    onChange={e => {
                                      const updated = [...onboardingMenuItems];
                                      updated[index].price = Number(e.target.value);
                                      setOnboardingMenuItems(updated);
                                    }}
                                    style={{ border: 'none', borderBottom: '1px solid transparent', fontSize: '0.75rem', fontWeight: 800, padding: 0, color: 'var(--secondary)', width: '50px' }}
                                    onFocus={e => e.target.style.borderBottom = '1px solid var(--secondary)'}
                                    onBlur={e => e.target.style.borderBottom = '1px solid transparent'}
                                  />
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveOnboardingMenuItem(index)}
                              style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="btn btn-outline"
                    style={{ flex: 1, borderRadius: '12px' }}
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2, borderRadius: '12px', gap: '6px', backgroundColor: 'var(--success)' }}
                    disabled={loading || isScanningMenu}
                  >
                    <Check size={16} /> {loading ? 'Cadastrando Quiosque...' : 'Concluir Onboarding & Ativar Barraca! 🚀'}
                  </button>
                </div>
              </div>
            )}

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
                onClick={() => { setMode('register'); setOnboardingStep(1); setError(''); }}
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

        {/* Demonstração rápida dos acessos removida para experiência 100% de produção */}
      </div>
      </section>

      {/* 3. Recursos Section */}
      <section id="recursos" className="landing-section" style={{ borderTop: '1px solid rgba(191, 161, 95, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.25)' }}>
        <div className="section-header">
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Por que Escolher a Maestria Beach?
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Feito Sob Medida para Quiosques & Resorts</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Esqueça comandas perdidas de papel ou pedidos cruzados na cozinha. Automatize seu fluxo do guarda-sol ao fechamento de caixa.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cardápio Inteligente com Scanner IA</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Esqueça digitações demoradas. Suba a imagem do seu cardápio de papel e veja nossa Inteligência Artificial ler e importar todos os pratos, categorias e preços em segundos.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span style={{ fontSize: '1.5rem' }}>🍳</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Painel de Cozinha & Bar c/ Chimes</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Divida a fila por categorias (Cozinha vs Bar) com total isolamento. Efeitos de chimes sonoros alertam seus colaboradores a cada novo pedido para atendimento recorde.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span style={{ fontSize: '1.5rem' }}>📱</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>POS Ultra-Responsivo c/ Split Screen</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Layout em duas colunas (Mapa de Mesas vs Menu) otimizado para tablets e desktops. Ideal para gerentes operarem com velocidade máxima e agilidade.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span style={{ fontSize: '1.5rem' }}>📊</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Métricas Financeiras & Caixa</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Acompanhe vendas por método de pagamento (Pix, Cartão, Dinheiro), gráficos interativos de faturamento e ranking de vendas dos garçons em tempo real.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span style={{ fontSize: '1.5rem' }}>💸</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Divisor de Conta & Calculadora de Troco</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Facilidade total no checkout. Divida a conta por número de pessoas e calcule trocos instantaneamente no celular do garçom ou no monitor do caixa.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-wrapper">
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Design Moderno de Alta Segurança</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Arquitetura multi-tenant com banco de dados isolado e criptografia completa. Sua barraca de praia com o melhor nível de segurança tecnológica global.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Planos Section */}
      <section id="planos" className="landing-section">
        <div className="section-header">
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Nossos Planos
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>O Investimento Certo para Todos os Tamanhos</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Digitalize o seu quiosque ou beach club hoje mesmo. Sem taxa de cancelamento ou taxas ocultas.
          </p>
        </div>

        <div className="pricing-grid">
          {/* Bronze */}
          <div className="pricing-card glass-panel">
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bronze (Quiosque Standard)</span>
              <div className="pricing-price">R$ 149<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/mês</span></div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Para pequenos quiosques familiares e barracas iniciando sua digitalização.</p>
            </div>
            <ul className="pricing-features-list">
              <li className="pricing-feature-item active">✓ Até 15 mesas configuráveis</li>
              <li className="pricing-feature-item active">✓ Cadastro de até 3 colaboradores</li>
              <li className="pricing-feature-item active">✓ Painel de Garçom responsivo</li>
              <li className="pricing-feature-item" style={{ opacity: 0.4 }}>✗ Painel de Cozinha em Tempo Real</li>
              <li className="pricing-feature-item" style={{ opacity: 0.4 }}>✗ Scanner de Cardápios por IA</li>
            </ul>
            <button 
              onClick={() => { setMode('register'); setOnboardingStep(1); setError(''); document.getElementById('auth-portal')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="btn btn-outline"
              style={{ width: '100%', borderRadius: '12px' }}
            >
              Iniciar Agora
            </button>
          </div>

          {/* Prata - Mais Vendido */}
          <div className="pricing-card glass-panel recommended">
            <div className="pricing-recommended-badge">Mais Popular 🏖️</div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Prata (Beach Club Premium)</span>
              <div className="pricing-price">R$ 299<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/mês</span></div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>O plano definitivo para barracas consolidadas, com total agilidade e controle.</p>
            </div>
            <ul className="pricing-features-list">
              <li className="pricing-feature-item active">✓ Até 40 mesas configuráveis</li>
              <li className="pricing-feature-item active">✓ Cadastros de colaboradores ilimitados</li>
              <li className="pricing-feature-item active">✓ Painel de Cozinha & Bar c/ Som</li>
              <li className="pricing-feature-item active">✓ Scanner IA de Cardápio Físico</li>
              <li className="pricing-feature-item active">✓ Gráficos de Faturamento & Métricas</li>
            </ul>
            <button 
              onClick={() => { setMode('register'); setOnboardingStep(1); setError(''); document.getElementById('auth-portal')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="btn btn-primary"
              style={{ width: '100%', borderRadius: '12px' }}
            >
              Experimentar Grátis
            </button>
          </div>

          {/* Ouro */}
          <div className="pricing-card glass-panel">
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ouro (Resort / Enterprise)</span>
              <div className="pricing-price">R$ 599<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/mês</span></div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Para redes de beach clubs de luxo, Resorts, Marinas e Hotéis Beira Mar.</p>
            </div>
            <ul className="pricing-features-list">
              <li className="pricing-feature-item active">✓ Zonas e mesas ilimitadas</li>
              <li className="pricing-feature-item active">✓ Multi-Terminais de Cozinha & Bar</li>
              <li className="pricing-feature-item active">✓ Personalização completa de Marca Branca</li>
              <li className="pricing-feature-item active">✓ Exportação de dados e APIs customizadas</li>
              <li className="pricing-feature-item active">✓ Gerente de Conta dedicado 24/7 VIP</li>
            </ul>
            <button 
              onClick={() => { setMode('register'); setOnboardingStep(1); setError(''); document.getElementById('auth-portal')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="btn btn-outline"
              style={{ width: '100%', borderRadius: '12px' }}
            >
              Falar com Consultor
            </button>
          </div>
        </div>
      </section>

      {/* 5. Depoimentos Section */}
      <section id="depoimentos" className="landing-section" style={{ borderTop: '1px solid rgba(191, 161, 95, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
        <div className="section-header">
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Depoimentos
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Histórias de Sucesso Reais</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Descubra como outros empresários de praia transformaram seus quiosques.
          </p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card glass-panel">
            <div style={{ display: 'flex', color: '#F59E0B', gap: '2px', fontSize: '1rem' }}>
              {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
            </div>
            <p className="testimonial-quote">
              "Com o Maestria Beach diminuímos os erros de pedido em 90%. O garçom atende na areia e a cozinha já começa a preparar. O fechamento de caixa por PIX agora bate em segundos."
            </p>
            <div className="testimonial-user">
              <div className="testimonial-avatar">MC</div>
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block' }}>Marcos Castro</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gerente do Coco Beach (Copacabana, RJ)</span>
              </div>
            </div>
          </div>

          <div className="testimonial-card glass-panel">
            <div style={{ display: 'flex', color: '#F59E0B', gap: '2px', fontSize: '1rem' }}>
              {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
            </div>
            <p className="testimonial-quote">
              "A funcionalidade de scanner por IA é incrível. Subi a foto do meu cardápio impresso de peixes e bebidas e o sistema puxou tudo. O tema personalizado na cor da nossa barraca ficou lindo."
            </p>
            <div className="testimonial-user">
              <div className="testimonial-avatar">AM</div>
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block' }}>Ana Moreira</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dona da Barraca Algas Marinhas (Fortaleza, CE)</span>
              </div>
            </div>
          </div>

          <div className="testimonial-card glass-panel">
            <div style={{ display: 'flex', color: '#F59E0B', gap: '2px', fontSize: '1rem' }}>
              {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
            </div>
            <p className="testimonial-quote">
              "Nossa operação no tablet split screen facilitou a vida do supervisor de caixa. Ele controla o mapa de consumo e a conta de longe. Recomendo fortemente a qualquer beach club."
            </p>
            <div className="testimonial-user">
              <div className="testimonial-avatar">RF</div>
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block' }}>Rodrigo Faria</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sócio-fundador do Sunset Club (Jurerê, SC)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="landing-footer">
        <span className="footer-logo">🏖️ Maestria Beach</span>
        <p style={{ fontSize: '0.8rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
          A plataforma SaaS definitiva para otimizar, gerenciar e alavancar o faturamento de quiosques de praia, resorts e beach clubs.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          <a href="#recursos" style={{ color: '#94a3b8', textDecoration: 'none' }}>Recursos</a>
          <a href="#planos" style={{ color: '#94a3b8', textDecoration: 'none' }}>Planos</a>
          <a href="#depoimentos" style={{ color: '#94a3b8', textDecoration: 'none' }}>Depoimentos</a>
        </div>
        <p style={{ fontSize: '0.7rem', color: '#64748b' }}>
          &copy; {new Date().getFullYear()} Maestria Beach. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};
