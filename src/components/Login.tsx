import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Camera,
  ChefHat,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  TabletSmartphone,
  UploadCloud,
  UserRound,
  UsersRound,
  Utensils,
  Waves
} from 'lucide-react';
import { Employee, MenuItem, StoreInfo } from '../types';
import { claimStoreInvite, loginEmployee, loginOwner, registerNewStoreExtended } from '../supabaseService';

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

type AccessMode = 'landing' | 'staff' | 'owner' | 'invite-welcome' | 'register';
type RegisterStep = 1 | 2 | 3 | 4;

type AiMenuItem = {
  name?: string;
  price?: number | string;
  description?: string;
  category?: string;
};

type AiMenuResponse = {
  items?: AiMenuItem[];
  categories?: string[];
};

const roleLabels: Record<Employee['role'], string> = {
  waiter: 'Garcom',
  kitchen: 'Cozinha',
  cashier: 'Caixa'
};

const roleDescriptions: Record<Employee['role'], string> = {
  waiter: 'Lanca pedidos por mesa e acompanha status.',
  kitchen: 'Recebe a fila de producao em tempo real.',
  cashier: 'Fecha contas, recibos e meios de pagamento.'
};

const starterMenu: Omit<MenuItem, 'id'>[] = [
  {
    name: 'Agua de coco gelada',
    price: 9,
    description: 'Coco natural servido gelado.',
    category: 'Bebidas',
    imageUrl: 'CO',
    isAvailable: true,
    isPromotion: false
  },
  {
    name: 'Isca de peixe crocante',
    price: 58,
    description: 'Porcao com molho tartaro da casa.',
    category: 'Petiscos',
    imageUrl: 'PX',
    isAvailable: true,
    isPromotion: false
  },
  {
    name: 'Caipirinha classica',
    price: 22,
    description: 'Limao, cachaca, gelo e acucar.',
    category: 'Bebidas',
    imageUrl: 'DR',
    isAvailable: true,
    isPromotion: false
  }
];

const buildTenantCode = (name: string) => {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4);

  return `${base || 'MB'}${Math.floor(100 + Math.random() * 900)}`;
};

const inferCategory = (name: string) => {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (
    ['agua', 'coco', 'suco', 'cerveja', 'chopp', 'drink', 'caipirinha', 'refrigerante', 'gin', 'vodka'].some(
      (term) => normalized.includes(term)
    )
  ) {
    return 'Bebidas';
  }

  if (['sorvete', 'acai', 'doce', 'sobremesa', 'pudim', 'torta'].some((term) => normalized.includes(term))) {
    return 'Sobremesas';
  }

  return 'Petiscos';
};

const buildItemCode = (name: string) => {
  const letters = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 2)
    .toUpperCase();

  return letters || 'IT';
};

const normalizeTextKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const buildMenuItemKey = (item: Pick<MenuItem, 'name' | 'price'>) =>
  `${normalizeTextKey(item.name)}-${Number(item.price || 0).toFixed(2)}`;

const mergeMenuItemsWithoutDuplicates = (
  currentItems: Omit<MenuItem, 'id'>[],
  importedItems: Omit<MenuItem, 'id'>[]
) => {
  const byKey = new Map<string, Omit<MenuItem, 'id'>>();

  currentItems.forEach((item) => {
    byKey.set(buildMenuItemKey(item), item);
  });

  importedItems.forEach((item) => {
    const key = buildMenuItemKey(item);
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...item,
      description: item.description || existing?.description || ''
    });
  });

  return Array.from(byKey.values());
};

const _parseMenuText = (text: string): Omit<MenuItem, 'id'>[] => {
  const items: Omit<MenuItem, 'id'>[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.replace(/[•·]/g, ' ').replace(/\s+/g, ' ').trim();
    if (line.length < 4) return;

    const match = line.match(/(.+?)\s+(?:R\$?\s*)?(\d{1,3}(?:[.,]\d{1,2})?)\s*$/i);
    if (!match) return;

    const name = match[1].replace(/[.\-_]{2,}/g, '').trim();
    const price = Number(match[2].replace(',', '.'));
    const key = `${name.toLowerCase()}-${price}`;

    if (!name || Number.isNaN(price) || price <= 0 || seen.has(key)) return;

    seen.add(key);
    items.push({
      name,
      price,
      description: 'Importado por IA a partir do cardapio fisico.',
      category: inferCategory(name),
      imageUrl: buildItemCode(name),
      isAvailable: true,
      isPromotion: false
    });
  });

  return items;
};

const imageFileToPayload = (file: File): Promise<{ imageBase64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Nao foi possivel preparar a imagem.'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        resolve({
          imageBase64: dataUrl.split(',')[1] || '',
          mimeType: 'image/jpeg'
        });
      };

      image.onerror = () => reject(new Error('Imagem invalida.'));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error('Nao foi possivel ler o arquivo.'));
    reader.readAsDataURL(file);
  });
};

const normalizeAiMenuItems = (items: AiMenuItem[], categories: string[]): Omit<MenuItem, 'id'>[] => {
  const allowedCategories = categories.length > 0 ? categories : ['Bebidas', 'Petiscos', 'Sobremesas', 'Outros'];
  const seen = new Set<string>();

  return items
    .map((item): Omit<MenuItem, 'id'> | null => {
      const name = String(item.name || '').trim();
      const price = Number(String(item.price ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
      const category = item.category && allowedCategories.includes(item.category) ? item.category : inferCategory(name);
      const key = `${name.toLowerCase()}-${price}`;

      if (!name || Number.isNaN(price) || price < 0 || seen.has(key)) return null;
      seen.add(key);

      return {
        name,
        price,
        description: String(item.description || 'Importado por IA a partir do cardapio fisico.').trim(),
        category: allowedCategories.includes(category) ? category : allowedCategories[0],
        imageUrl: buildItemCode(name),
        isAvailable: true,
        isPromotion: false
      };
    })
    .filter((item): item is Omit<MenuItem, 'id'> => item !== null);
};

export const Login: React.FC<LoginProps> = ({ employees, onLoginSuccess, storeName }) => {
  const inviteParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const loginMode = params.get('login');
    const initialMode: 'owner' | 'staff' | null =
      loginMode === 'owner' || loginMode === 'staff' ? loginMode : null;
    return {
      storeId: params.get('store') || '',
      token: params.get('token') || '',
      isInvite: window.location.pathname === '/invite' && Boolean(params.get('store')) && Boolean(params.get('token')),
      initialMode
    };
  }, []);
  const [mode, setMode] = useState<AccessMode>(
    inviteParams.isInvite ? 'invite-welcome' : inviteParams.initialMode || 'landing'
  );
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [tenantCode, setTenantCode] = useState('MAES01');
  const [pin, setPin] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('dono@maestria.com');
  const [ownerPassword, setOwnerPassword] = useState('admin');

  const [newStoreName, setNewStoreName] = useState('');
  const [newTenantCode, setNewTenantCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreTablesCount, setNewStoreTablesCount] = useState(18);
  const [newStoreServiceCharge, setNewStoreServiceCharge] = useState(10);
  const [newStoreThemeColor, setNewStoreThemeColor] = useState('teal');
  const [newStoreLogo, setNewStoreLogo] = useState('MB');
  const [storeCategories, setStoreCategories] = useState(['Bebidas', 'Petiscos', 'Sobremesas', 'Outros']);
  const [newCategory, setNewCategory] = useState('');
  const [onboardingEmployees, setOnboardingEmployees] = useState<Omit<Employee, 'id'>[]>([
    { name: 'Garcom principal', role: 'waiter', pin: '1234' },
    { name: 'Cozinha', role: 'kitchen', pin: '1111' },
    { name: 'Caixa', role: 'cashier', pin: '2222' }
  ]);
  const [onboardingMenuItems, setOnboardingMenuItems] = useState<Omit<MenuItem, 'id'>[]>(starterMenu);
  const [menuImagePreviews, setMenuImagePreviews] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [isScanningMenu, setIsScanningMenu] = useState(false);

  const totalMenuValue = useMemo(
    () => onboardingMenuItems.reduce((sum, item) => sum + item.price, 0),
    [onboardingMenuItems]
  );

  const handleModeChange = (nextMode: AccessMode) => {
    if (nextMode === 'register' && !inviteParams.isInvite) {
      setMode('landing');
      setError('A criacao de barraca agora e feita por convite unico enviado pelo Maestria Beach.');
      return;
    }

    setMode(nextMode);
    setError('');
    if (nextMode === 'register') setRegisterStep(1);
  };

  const handleStaffSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError('');

    const normalizedTenant = tenantCode.trim().toUpperCase();
    if (!normalizedTenant || pin.length !== 4) {
      setError('Informe o codigo da barraca e um PIN de 4 digitos.');
      return;
    }

    setLoading(true);
    const result = await loginEmployee(normalizedTenant, pin);
    setLoading(false);

    if (result) {
      onLoginSuccess(result.employee, undefined, result.store, result.storeId);
      return;
    }

    const localStoreInfo = JSON.parse(localStorage.getItem('mb_store_info') || '{}');
    const isLocalStore =
      normalizedTenant === 'MAES01' || normalizedTenant === localStoreInfo.tenantCode?.toUpperCase();
    const localEmployee = employees.find((employee) => employee.pin === pin);

    if (isLocalStore && localEmployee) {
      onLoginSuccess(localEmployee, undefined, localStoreInfo, 'local');
      return;
    }

    setPin('');
    setError('Barraca ou PIN incorretos.');
  };

  const handleOwnerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!ownerEmail || !ownerPassword) {
      setError('Preencha e-mail e senha do administrador.');
      return;
    }

    setLoading(true);
    const result = await loginOwner(ownerEmail, ownerPassword);
    setLoading(false);

    if (result) {
      onLoginSuccess(result.employee, 'owner', result.store, result.storeId);
      return;
    }

    if (ownerEmail === 'dono@maestria.com' && ownerPassword === 'admin') {
      const localStoreInfo = JSON.parse(localStorage.getItem('mb_store_info') || '{}');
      const ownerEmployee =
        employees.find((employee) => employee.pin === '0000') ||
        ({ id: 'e1', name: 'Dono administrador', role: 'cashier', pin: '0000' } as Employee);
      onLoginSuccess(ownerEmployee, 'owner', localStoreInfo, 'local');
      return;
    }

    setError('E-mail ou senha incorretos.');
  };

  const validateCurrentStep = () => {
    if (registerStep === 1) {
      if (!newStoreName.trim() || !newEmail.trim() || newPassword.length < 4) {
        setError('Preencha nome da barraca, e-mail do dono e senha.');
        return false;
      }
    }

    if (registerStep === 2) {
      if (newStoreTablesCount < 1 || newStoreServiceCharge < 0) {
        setError('Revise quantidade de mesas e taxa de servico.');
        return false;
      }
    }

    if (registerStep === 3) {
      const hasInvalidPin = onboardingEmployees.some((employee) => employee.pin.length !== 4);
      if (onboardingEmployees.length === 0 || hasInvalidPin) {
        setError('Todos os funcionarios precisam de um PIN de 4 digitos.');
        return false;
      }
    }

    return true;
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (registerStep < 4) {
      if (!validateCurrentStep()) return;
      if (registerStep === 1 && !newTenantCode.trim()) setNewTenantCode(buildTenantCode(newStoreName));
      setRegisterStep((current) => (current + 1) as RegisterStep);
      return;
    }

    const finalTenantCode = (newTenantCode || buildTenantCode(newStoreName)).trim().toUpperCase();
    const finalStoreInfo: StoreInfo = {
      name: newStoreName.trim(),
      logoUrl: newStoreLogo.trim() || 'MB',
      address: newStoreAddress.trim(),
      phone: newStorePhone.trim(),
      tablesCount: newStoreTablesCount,
      serviceChargePercent: newStoreServiceCharge,
      tenantCode: finalTenantCode,
      themeColor: newStoreThemeColor,
      categories: storeCategories
    };

    setLoading(true);
    const result = inviteParams.isInvite
      ? await claimStoreInvite(
          inviteParams.storeId,
          inviteParams.token,
          { ...finalStoreInfo, tenantCode: finalTenantCode },
          newEmail.trim(),
          newPassword,
          onboardingEmployees,
          onboardingMenuItems
        )
      : await registerNewStoreExtended(
          { ...finalStoreInfo, tenantCode: finalTenantCode },
          newEmail.trim(),
          newPassword,
          onboardingEmployees,
          onboardingMenuItems
        );
    setLoading(false);

    if (result) {
      onLoginSuccess(result.employee, 'owner', result.store, result.storeId);
      return;
    }

    const localEmployees: Employee[] = [
      { id: 'e1', name: 'Dono administrador', role: 'cashier', pin: '0000' },
      ...onboardingEmployees.map((employee, index) => ({
        id: `e_onb_${index}`,
        ...employee
      }))
    ];
    const localMenuItems: MenuItem[] = onboardingMenuItems.map((item, index) => ({
      id: `m_onb_${index}`,
      ...item
    }));

    localStorage.setItem('mb_store_info', JSON.stringify(finalStoreInfo));
    localStorage.setItem('mb_employees', JSON.stringify(localEmployees));
    localStorage.setItem('mb_menu_items', JSON.stringify(localMenuItems));
    localStorage.setItem('mb_orders', JSON.stringify([]));
    localStorage.setItem('mb_sales', JSON.stringify([]));

    onLoginSuccess(localEmployees[0], 'owner', finalStoreInfo, 'local');
  };

  const updateOnboardingEmployee = (index: number, patch: Partial<Omit<Employee, 'id'>>) => {
    setOnboardingEmployees((current) =>
      current.map((employee, currentIndex) => (currentIndex === index ? { ...employee, ...patch } : employee))
    );
  };

  const updateOnboardingMenuItem = (index: number, patch: Partial<Omit<MenuItem, 'id'>>) => {
    setOnboardingMenuItems((current) =>
      current.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item))
    );
  };

  const addCategory = () => {
    const category = newCategory.trim();
    if (!category || storeCategories.includes(category)) return;
    setStoreCategories((current) => [...current, category]);
    setNewCategory('');
  };

  const handleMenuPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setMenuImagePreviews(files.map((file) => URL.createObjectURL(file)));
    setIsScanningMenu(true);
    setScanProgress(8);
    setScanStatus(`Preparando ${files.length} foto(s) para o Gemini...`);

    try {
      const images = await Promise.all(files.slice(0, 8).map((file) => imageFileToPayload(file)));
      setScanProgress(30);
      setScanStatus('Enviando cardapios para analise com Gemini...');

      const response = await fetch('/api/ai-menu-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          categories: storeCategories
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Falha na analise do Gemini.');
      }

      setScanProgress(82);
      setScanStatus('Consolidando itens, precos, categorias e duplicados...');

      const result = (await response.json()) as AiMenuResponse;
      const suggestedCategories = (result.categories || [])
        .map((category) => String(category).trim())
        .filter(Boolean);
      const mergedCategories = Array.from(new Set([...storeCategories, ...suggestedCategories]));
      const extractedItems = normalizeAiMenuItems(result.items || [], mergedCategories);
      if (extractedItems.length === 0) throw new Error('Nenhum item encontrado');

      setStoreCategories(mergedCategories);
      setOnboardingMenuItems((currentItems) => mergeMenuItemsWithoutDuplicates(currentItems, extractedItems));
      setScanProgress(100);
      setScanStatus(`${extractedItems.length} itens analisados pelo Gemini. Categorias e duplicados foram consolidados.`);
    } catch (scanError) {
      console.warn('Falha na IA do cardapio:', scanError);
      setScanProgress(100);
      setScanStatus('Nao consegui analisar com Gemini agora. Confira a chave GEMINI_API_KEY e tente novamente.');
    } finally {
      setIsScanningMenu(false);
    }
  };

  const header = (
    <header className="landing-nav product-nav">
      <div className="wordmark">
        <span className="wordmark-mark">MB</span>
        <span>Maestria Beach</span>
      </div>

      {mode !== 'landing' && mode !== 'invite-welcome' && (
        <nav className="landing-nav-links product-nav-links">
          <button className={mode === 'staff' ? 'active' : ''} onClick={() => handleModeChange('staff')} type="button">
            Login equipe
          </button>
          <button className={mode === 'owner' ? 'active' : ''} onClick={() => handleModeChange('owner')} type="button">
            Login dono
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => handleModeChange('register')} type="button">
            Criar barraca
          </button>
        </nav>
      )}

      {mode !== 'invite-welcome' && (
        <div className="nav-actions">
          <button className="btn btn-primary landing-main-cta" onClick={() => handleModeChange('register')} type="button">
            Criar sua Barraca
          </button>
        </div>
      )}
    </header>
  );

  const errorMessage = error ? (
    <div className="auth-error" role="alert">
      {error}
    </div>
  ) : null;

  const staffPage = (
    <main className="login-page-shell">
      <section className="login-visual-panel">
        <span className="hero-kicker">
          <Waves size={16} /> Login operacional
        </span>
        <h1>Uma tela para cada funcionario entrar direto no trabalho.</h1>
        <p>
          O dono cadastra a equipe e cada pessoa acessa apenas o painel do seu cargo usando codigo
          da barraca e PIN. Sem e-mail, sem senha longa, sem confusao no turno.
        </p>
        <div className="staff-route-grid">
          {(['waiter', 'kitchen', 'cashier'] as Employee['role'][]).map((role) => (
            <div key={role}>
              <strong>{roleLabels[role]}</strong>
              <span>{roleDescriptions[role]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="auth-console auth-page-card">
        {errorMessage}
        <form className="auth-form" onSubmit={handleStaffSubmit}>
          <div className="auth-heading">
            <span className="icon-tile">
              <KeyRound size={18} />
            </span>
            <div>
              <h2>Entrar como funcionario</h2>
              <p>Use o codigo da barraca e seu PIN de 4 digitos.</p>
            </div>
          </div>

          <label>
            Codigo da barraca
            <input
              value={tenantCode}
              onChange={(event) => setTenantCode(event.target.value.toUpperCase())}
              placeholder="MAES01"
            />
          </label>

          <div>
            <span className="field-label">PIN de acesso</span>
            <div className="pin-display">{pin.padEnd(4, '*')}</div>
            <div className="pin-pad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    if (pin.length < 4) setPin((current) => `${current}${digit}`);
                  }}
                >
                  {digit}
                </button>
              ))}
              <button type="button" onClick={() => setPin((current) => current.slice(0, -1))}>
                Apagar
              </button>
              <button type="submit" disabled={loading || pin.length !== 4}>
                Entrar
              </button>
            </div>
          </div>

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Abrir meu painel'}
          </button>
        </form>
      </section>
    </main>
  );

  const ownerPage = (
    <main className="login-page-shell owner-login-shell">
      <section className="login-visual-panel">
        <span className="hero-kicker">
          <ShieldCheck size={16} /> Acesso administrativo
        </span>
        <h1>O dono entra para configurar, acompanhar e melhorar a operacao.</h1>
        <p>
          Ajuste dados comerciais, mesas, funcionarios, cardapio, categorias, taxa de servico e
          acompanhe indicadores da barraca.
        </p>
        <div className="owner-feature-list">
          <span>
            <LayoutDashboard size={18} /> Dashboard financeiro
          </span>
          <span>
            <UsersRound size={18} /> Equipe e PINs
          </span>
          <span>
            <Utensils size={18} /> Cardapio editavel
          </span>
        </div>
      </section>

      <section className="auth-console auth-page-card">
        {errorMessage}
        <form className="auth-form" onSubmit={handleOwnerSubmit}>
          <div className="auth-heading">
            <span className="icon-tile">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2>Entrar como dono</h2>
              <p>Acesso total ao painel administrativo.</p>
            </div>
          </div>

          <label>
            E-mail
            <span className="input-icon">
              <Mail size={16} />
              <input
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="voce@barraca.com"
              />
            </span>
          </label>

          <label>
            Senha
            <span className="input-icon">
              <LockKeyhole size={16} />
              <input
                type="password"
                value={ownerPassword}
                onChange={(event) => setOwnerPassword(event.target.value)}
                placeholder="Senha"
              />
            </span>
          </label>

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Validando...' : 'Abrir administracao'}
          </button>
        </form>
      </section>
    </main>
  );

  const inviteWelcomePage = (
    <main className="invite-welcome-page">
      <section className="invite-welcome-card">
        <span className="hero-kicker">
          <Sparkles size={16} /> Convite exclusivo Maestria Beach
        </span>
        <h1>Bem-vindo. Vamos montar a operacao digital da sua barraca.</h1>
        <p>
          Este link foi criado pelo time Maestria Beach e funciona uma unica vez. Em poucos passos voce
          configura dados da barraca, mesas, equipe, cardapio e acessos para comecar a operar sem papel.
        </p>
        <div className="invite-benefits">
          <span>
            <Check size={16} /> Link unico e seguro
          </span>
          <span>
            <UsersRound size={16} /> Equipe com acessos separados
          </span>
          <span>
            <Utensils size={16} /> Cardapio manual ou com IA
          </span>
        </div>
        <button className="million-cta" type="button" onClick={() => handleModeChange('register')}>
          COMEÇAR
          <ArrowRight size={20} />
        </button>
      </section>
    </main>
  );

  const createStorePage = (
    <main className="create-store-page">
      <aside className="wizard-sidebar">
        <span className="hero-kicker">
          <Store size={16} /> Criar barraca
        </span>
        <h1>Configure sua operacao passo a passo.</h1>
        <p>Dados comerciais, mesas, equipe, cardapio por IA e revisao final antes de ativar.</p>
        <div className="wizard-steps">
          {[
            ['Identidade', 'Nome, dono e acesso'],
            ['Operacao', 'Mesas, taxa e tema'],
            ['Equipe', 'Funcionarios e PINs'],
            ['Cardapio IA', 'Foto, itens e revisao']
          ].map(([title, description], index) => {
            const step = (index + 1) as RegisterStep;
            return (
              <button
                key={title}
                className={registerStep === step ? 'active' : registerStep > step ? 'done' : ''}
                onClick={() => setRegisterStep(step)}
                type="button"
              >
                <strong>{index + 1}</strong>
                <span>
                  {title}
                  <small>{description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="wizard-workspace">
        {errorMessage}
        <form className="auth-form register-form" onSubmit={handleRegisterSubmit}>
          <div className="register-progress">
            {[1, 2, 3, 4].map((step) => (
              <span key={step} className={registerStep >= step ? 'active' : ''} />
            ))}
          </div>

          {registerStep === 1 && (
            <div className="wizard-card">
              <div className="auth-heading">
                <span className="icon-tile">
                  <Store size={18} />
                </span>
                <div>
                  <h2>Identidade da barraca</h2>
                  <p>Cadastre a conta do dono e o codigo que a equipe vai usar.</p>
                </div>
              </div>

              <div className="form-grid two">
                <label>
                  Nome comercial
                  <input
                    value={newStoreName}
                    onChange={(event) => {
                      setNewStoreName(event.target.value);
                      if (!newTenantCode) setNewTenantCode(buildTenantCode(event.target.value));
                    }}
                    placeholder="Barraca Mar Azul"
                  />
                </label>
                <label>
                  Codigo da equipe
                  <input
                    value={newTenantCode}
                    onChange={(event) => setNewTenantCode(event.target.value.toUpperCase())}
                    placeholder="MAR123"
                  />
                </label>
              </div>

              <label>
                Localizacao
                <span className="input-icon">
                  <MapPin size={16} />
                  <input
                    value={newStoreAddress}
                    onChange={(event) => setNewStoreAddress(event.target.value)}
                    placeholder="Praia, quiosque, cidade"
                  />
                </span>
              </label>

              <div className="form-grid two">
                <label>
                  E-mail do dono
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="dono@barraca.com"
                  />
                </label>
                <label>
                  Senha do dono
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Minimo 4 caracteres"
                  />
                </label>
              </div>
            </div>
          )}

          {registerStep === 2 && (
            <div className="wizard-card">
              <div className="auth-heading">
                <span className="icon-tile">
                  <Waves size={18} />
                </span>
                <div>
                  <h2>Operacao e marca</h2>
                  <p>Defina capacidade, cobranca, contato, tema visual e categorias.</p>
                </div>
              </div>

              <div className="form-grid three">
                <label>
                  Mesas / guarda-sois
                  <input
                    min={1}
                    max={120}
                    type="number"
                    value={newStoreTablesCount}
                    onChange={(event) => setNewStoreTablesCount(Number(event.target.value))}
                  />
                </label>
                <label>
                  Taxa de servico (%)
                  <input
                    min={0}
                    max={30}
                    type="number"
                    value={newStoreServiceCharge}
                    onChange={(event) => setNewStoreServiceCharge(Number(event.target.value))}
                  />
                </label>
                <label>
                  Marca curta
                  <input
                    maxLength={3}
                    value={newStoreLogo}
                    onChange={(event) => setNewStoreLogo(event.target.value.toUpperCase())}
                  />
                </label>
              </div>

              <div className="form-grid two">
                <label>
                  WhatsApp / telefone
                  <span className="input-icon">
                    <Phone size={16} />
                    <input
                      value={newStorePhone}
                      onChange={(event) => setNewStorePhone(event.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </span>
                </label>
                <label>
                  Tema visual
                  <select value={newStoreThemeColor} onChange={(event) => setNewStoreThemeColor(event.target.value)}>
                    <option value="teal">Teal executivo</option>
                    <option value="coral">Coral sunset</option>
                    <option value="gold">Dourado premium</option>
                    <option value="emerald">Esmeralda praia</option>
                  </select>
                </label>
              </div>

              <div className="category-builder">
                <span className="field-label">Categorias do cardapio</span>
                <div className="category-chips">
                  {storeCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() =>
                        setStoreCategories((current) => current.filter((currentCategory) => currentCategory !== category))
                      }
                    >
                      {category} <Minus size={13} />
                    </button>
                  ))}
                </div>
                <div className="inline-add">
                  <input
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="Ex: Drinks autorais"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCategory();
                      }
                    }}
                  />
                  <button className="btn btn-outline" type="button" onClick={addCategory}>
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>
            </div>
          )}

          {registerStep === 3 && (
            <div className="wizard-card">
              <div className="auth-heading">
                <span className="icon-tile">
                  <UsersRound size={18} />
                </span>
                <div>
                  <h2>Equipe inicial</h2>
                  <p>Crie acessos separados para garcom, cozinha e caixa.</p>
                </div>
              </div>

              <div className="setup-list">
                {onboardingEmployees.map((employee, index) => (
                  <div className="setup-row" key={`${employee.role}-${index}`}>
                    <UserRound size={17} />
                    <input
                      value={employee.name}
                      onChange={(event) => updateOnboardingEmployee(index, { name: event.target.value })}
                    />
                    <select
                      value={employee.role}
                      onChange={(event) =>
                        updateOnboardingEmployee(index, { role: event.target.value as Employee['role'] })
                      }
                    >
                      <option value="waiter">Garcom</option>
                      <option value="kitchen">Cozinha</option>
                      <option value="cashier">Caixa</option>
                    </select>
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      value={employee.pin}
                      onChange={(event) =>
                        updateOnboardingEmployee(index, { pin: event.target.value.replace(/\D/g, '') })
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remover funcionario"
                      onClick={() =>
                        setOnboardingEmployees((current) =>
                          current.filter((_, currentIndex) => currentIndex !== index)
                        )
                      }
                    >
                      <Minus size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="btn btn-outline"
                type="button"
                onClick={() =>
                  setOnboardingEmployees((current) => [
                    ...current,
                    { name: 'Novo funcionario', role: 'waiter', pin: '' }
                  ])
                }
              >
                <Plus size={16} /> Adicionar funcionario
              </button>

              <div className="role-strip">
                {(['waiter', 'kitchen', 'cashier'] as Employee['role'][]).map((role) => (
                  <span key={role}>
                    <strong>{roleLabels[role]}</strong>
                    {roleDescriptions[role]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {registerStep === 4 && (
            <div className="wizard-card">
              <div className="auth-heading">
                <span className="icon-tile">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h2>Cardapio com IA</h2>
                  <p>Tire uma foto do cardapio fisico e revise os itens importados.</p>
                </div>
              </div>

              <div className="ai-menu-importer">
                <label className="photo-dropzone">
                  <input type="file" accept="image/*" multiple onChange={handleMenuPhotoUpload} />
                  {menuImagePreviews.length > 0 ? (
                    <div className="photo-preview-stack">
                      {menuImagePreviews.slice(0, 4).map((preview, index) => (
                        <img key={preview} src={preview} alt={`Cardapio enviado ${index + 1}`} />
                      ))}
                      {menuImagePreviews.length > 4 && <strong>+{menuImagePreviews.length - 4}</strong>}
                    </div>
                  ) : (
                    <span>
                      <Camera size={28} />
                      Enviar fotos dos cardapios
                      <small>Use uma ou varias fotos. A IA mescla tudo sem duplicar.</small>
                    </span>
                  )}
                </label>

                <div className="ai-import-panel">
                  <span className="hero-kicker">
                    <UploadCloud size={15} /> Importacao inteligente
                  </span>
                  <h3>Como funciona</h3>
                  <p>
                    A IA le uma ou varias imagens, identifica produtos, cria categorias novas quando
                    necessario e mescla itens repetidos antes de salvar.
                  </p>
                  <div className="scan-progress">
                    <span style={{ width: `${scanProgress}%` }} />
                  </div>
                  <small>{scanStatus || 'Envie uma foto nitida para preencher automaticamente.'}</small>
                </div>
              </div>

              <div className="setup-list menu-setup">
                {onboardingMenuItems.map((item, index) => (
                  <div className="setup-row" key={`${item.name}-${index}`}>
                    <Utensils size={17} />
                    <input
                      value={item.name}
                      onChange={(event) => updateOnboardingMenuItem(index, { name: event.target.value })}
                    />
                    <select
                      value={item.category}
                      onChange={(event) => updateOnboardingMenuItem(index, { category: event.target.value })}
                    >
                      {storeCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.price}
                      onChange={(event) => updateOnboardingMenuItem(index, { price: Number(event.target.value) })}
                    />
                    <button
                      type="button"
                      aria-label="Remover item"
                      onClick={() =>
                        setOnboardingMenuItems((current) => current.filter((_, currentIndex) => currentIndex !== index))
                      }
                    >
                      <Minus size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="register-summary">
                <span>
                  <strong>{onboardingMenuItems.length}</strong> itens no cardapio
                </span>
                <span>
                  <strong>R$ {totalMenuValue.toFixed(2)}</strong> soma dos precos
                </span>
                <span>
                  <strong>{storeCategories.length}</strong> categorias ativas
                </span>
              </div>

              <button
                className="btn btn-outline"
                type="button"
                disabled={isScanningMenu}
                onClick={() =>
                  setOnboardingMenuItems((current) => [
                    ...current,
                    {
                      name: 'Novo item',
                      price: 0,
                      description: '',
                      category: storeCategories[0] || 'Petiscos',
                      imageUrl: 'IT',
                      isAvailable: true,
                      isPromotion: false
                    }
                  ])
                }
              >
                <Plus size={16} /> Adicionar item manualmente
              </button>
            </div>
          )}

          <div className="register-actions wizard-actions">
            {registerStep > 1 && (
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setRegisterStep((current) => (current - 1) as RegisterStep)}
              >
                <ChevronLeft size={16} /> Voltar
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading || isScanningMenu}>
              {registerStep < 4 ? 'Continuar' : loading ? 'Criando...' : 'Ativar barraca'}
              {registerStep < 4 ? <ArrowRight size={16} /> : <Check size={16} />}
            </button>
          </div>
        </form>
      </section>
    </main>
  );

  const landingPage = (
    <main className="million-landing">
      <section className="million-hero">
        <div className="million-hero-copy">
          <span className="hero-kicker premium-kicker">
            <Sparkles size={16} /> Sistema premium para barracas que querem vender mais
          </span>
          <h1>Sua barraca deixando de operar no papel e virando uma maquina de pedidos.</h1>
          <p>
            O Maestria Beach organiza garcons, cozinha, bar e caixa em tempo real. Menos pedido perdido,
            menos atraso, mais giro de mesa, mais controle e uma experiencia muito mais profissional para o cliente.
          </p>

          <button className="million-cta" onClick={() => handleModeChange('register')} type="button">
            Solicitar convite Maestria
            <ArrowRight size={20} />
          </button>
          {errorMessage}

          <div className="million-proof-row" aria-label="Beneficios principais">
            <span>
              <strong>Tempo real</strong>
              pedido pronto aparece para o garcom
            </span>
            <span>
              <strong>Sem papel</strong>
              mesa, comanda e caixa conectados
            </span>
            <span>
              <strong>Mais venda</strong>
              equipe atende mais rapido
            </span>
          </div>
        </div>

        <div className="live-ops-stage" aria-hidden="true">
          <div className="sun-orbit" />
          <div className="floating-ticket ticket-one">
            <span>Mesa 12</span>
            <strong>2x Camarao alho e oleo</strong>
            <small>Enviado para cozinha</small>
          </div>
          <div className="floating-ticket ticket-two">
            <span>Bar</span>
            <strong>4x Caipirinha</strong>
            <small>Pronto para buscar</small>
          </div>
          <div className="ops-device">
            <div className="ops-device-top">
              <span>Hoje na praia</span>
              <strong>R$ 8.742</strong>
            </div>
            <div className="ops-flow-line active">
              <TabletSmartphone size={18} />
              <div>
                <strong>Garcom lanca</strong>
                <span>Mesa 08 - 5 itens</span>
              </div>
              <BadgeCheck size={18} />
            </div>
            <div className="ops-flow-line cooking">
              <ChefHat size={18} />
              <div>
                <strong>Cozinha prepara</strong>
                <span>Isca de peixe - 06 min</span>
              </div>
              <Clock3 size={18} />
            </div>
            <div className="ops-flow-line ready">
              <BellRing size={18} />
              <div>
                <strong>Garcom avisado</strong>
                <span>Mesa certa, pedido certo</span>
              </div>
              <Check size={18} />
            </div>
            <div className="ops-flow-line paid">
              <ReceiptText size={18} />
              <div>
                <strong>Caixa fecha</strong>
                <span>Recibo e total no painel</span>
              </div>
              <CircleDollarSign size={18} />
            </div>
          </div>
        </div>
      </section>

      <section className="million-value-strip">
        {[
          ['Pedidos que nao somem', 'Cada item tem mesa, garcom, status e horario. A cozinha nao precisa decifrar papel molhado.'],
          ['Equipe trabalhando junto', 'Mais de um garcom opera ao mesmo tempo, cada um com seus pedidos e alertas de prato pronto.'],
          ['Dono com controle real', 'Cardapio, funcionarios, caixa, vendas e configuracao da barraca em um painel limpo.'],
          ['Cardapio com IA', 'Tire foto do cardapio fisico e o sistema ajuda a montar itens, precos e categorias.']
        ].map(([title, description]) => (
          <article key={title}>
            <BadgeCheck size={19} />
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="million-story-section">
        <div>
          <span className="section-eyebrow">Por que vende mais</span>
          <h2>Quando o atendimento fica rapido, a mesa gira. Quando a mesa gira, o caixa cresce.</h2>
        </div>
        <div className="million-story-grid">
          <div>
            <strong>01</strong>
            <h3>Garcom atende sem voltar no balcao</h3>
            <p>Ele abre a mesa, lanca o pedido no celular e continua vendendo na areia.</p>
          </div>
          <div>
            <strong>02</strong>
            <h3>Cozinha recebe limpo e priorizado</h3>
            <p>Pedido entra com observacao, tempo e setor. Bar e cozinha sabem exatamente o que fazer.</p>
          </div>
          <div>
            <strong>03</strong>
            <h3>Pronto vira alerta para entregar</h3>
            <p>O garcom responsavel recebe o aviso e leva para a mesa certa, sem gritaria e sem atraso.</p>
          </div>
          <div>
            <strong>04</strong>
            <h3>Caixa fecha com confianca</h3>
            <p>Consumo, taxa, desconto e recibo ficam prontos para cobrar sem recalcular tudo no papel.</p>
          </div>
        </div>
      </section>
    </main>
  );

  const landingSections = null;

  return (
    <div className="landing-page product-landing">
      {header}
      {mode === 'landing' && landingPage}
      {mode === 'invite-welcome' && inviteWelcomePage}
      {mode === 'staff' && staffPage}
      {mode === 'owner' && ownerPage}
      {mode === 'register' && createStorePage}
      {landingSections}
      <footer className="landing-footer product-footer">
        <span>Maestria Beach</span>
        <p>{storeName || 'Beach operation system'} pronto para administrar a praia em tempo real.</p>
        <small>
          <Clock3 size={14} /> Build operacional para SaaS de barracas.
        </small>
      </footer>
    </div>
  );
};
