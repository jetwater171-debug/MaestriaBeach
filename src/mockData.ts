import { StoreInfo, MenuItem, Employee, Order, DailySale } from './types';

export const DEFAULT_STORE_INFO: StoreInfo = {
  name: 'Maestria Beach Club',
  logoUrl: 'MB',
  address: 'Avenida Beira Mar, 1000 - Ceara, Brasil',
  phone: '(85) 99999-8888',
  tablesCount: 15,
  serviceChargePercent: 10,
  tenantCode: 'MAES01',
  themeColor: 'teal',
  categories: ['Bebidas', 'Petiscos', 'Sobremesas']
};

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Agua de Coco Gelada',
    price: 8,
    description: 'Coco verde natural colhido no dia, servido bem gelado.',
    category: 'Bebidas',
    imageUrl: 'CO',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm2',
    name: 'Caipirinha Tradicional',
    price: 18,
    description: 'Cachaca artesanal, limao tahiti, acucar e bastante gelo.',
    category: 'Bebidas',
    imageUrl: 'DR',
    isAvailable: true,
    isPromotion: true,
    promotionalPrice: 15
  },
  {
    id: 'm3',
    name: 'Isca de Peixe Crocante',
    price: 55,
    description: 'File de peixe fresco empanado no panko. Acompanha molho tartaro da casa.',
    category: 'Petiscos',
    imageUrl: 'PX',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm4',
    name: 'Camarao ao Alho e Oleo',
    price: 69,
    description: 'Camaroes selecionados dourados no azeite com alho laminado e salsinha.',
    category: 'Petiscos',
    imageUrl: 'CM',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm5',
    name: 'Pastel de Queijo Coalho',
    price: 24,
    description: '6 unidades de mini pasteis recheados com queijo coalho.',
    category: 'Petiscos',
    imageUrl: 'PA',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm6',
    name: 'Batata Frita Rustica',
    price: 28,
    description: 'Porcao de batatas rusticas com alecrim e maionese de alho.',
    category: 'Petiscos',
    imageUrl: 'BT',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm7',
    name: 'Cerveja Long Neck Premium',
    price: 12,
    description: 'Long neck bem gelada para atendimento rapido.',
    category: 'Bebidas',
    imageUrl: 'CV',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm8',
    name: 'Suco Natural de Maracuja',
    price: 10,
    description: 'Suco da fruta com ou sem acucar.',
    category: 'Bebidas',
    imageUrl: 'SC',
    isAvailable: true,
    isPromotion: false
  }
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'e1',
    name: 'Dono Administrador',
    role: 'cashier',
    pin: '0000'
  },
  {
    id: 'e2',
    name: 'Carlos Santos',
    role: 'waiter',
    pin: '1234'
  },
  {
    id: 'e3',
    name: 'Mariana Souza',
    role: 'waiter',
    pin: '5678'
  },
  {
    id: 'e4',
    name: 'Chef Bahia',
    role: 'kitchen',
    pin: '1111'
  },
  {
    id: 'e5',
    name: 'Sandra Silva',
    role: 'cashier',
    pin: '2222'
  }
];

const memoryStore: Record<string, unknown> = {
  mb_store_info: DEFAULT_STORE_INFO,
  mb_menu_items: DEFAULT_MENU_ITEMS,
  mb_employees: DEFAULT_EMPLOYEES,
  mb_orders: [],
  mb_sales: []
};

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`LocalStorage indisponivel para "${key}". Usando memoria local.`, error);
    return JSON.stringify(memoryStore[key]);
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`LocalStorage bloqueado para "${key}". Salvando em memoria local.`, error);
  }

  try {
    memoryStore[key] = JSON.parse(value);
  } catch (error) {
    console.error('Erro ao atualizar memoria local:', error);
  }
};

const safeParseJSON = <T,>(jsonString: string | null, fallbackValue: T): T => {
  if (!jsonString) return fallbackValue;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Erro ao ler JSON do LocalStorage. Usando valor padrao.', error);
    return fallbackValue;
  }
};

export const initializeLocalStorage = () => {
  try {
    if (!safeGetItem('mb_store_info')) {
      safeSetItem('mb_store_info', JSON.stringify(DEFAULT_STORE_INFO));
    }
    if (!safeGetItem('mb_menu_items')) {
      safeSetItem('mb_menu_items', JSON.stringify(DEFAULT_MENU_ITEMS));
    }
    if (!safeGetItem('mb_employees')) {
      safeSetItem('mb_employees', JSON.stringify(DEFAULT_EMPLOYEES));
    }
    if (!safeGetItem('mb_orders')) {
      safeSetItem('mb_orders', JSON.stringify([]));
    }
    if (!safeGetItem('mb_sales')) {
      safeSetItem('mb_sales', JSON.stringify([]));
    }
  } catch (error) {
    console.error('Erro ao inicializar LocalStorage:', error);
  }
};

export const getStoreInfo = (): StoreInfo => {
  const item = safeGetItem('mb_store_info');
  return safeParseJSON(item, DEFAULT_STORE_INFO);
};

export const getMenuItems = (): MenuItem[] => {
  const item = safeGetItem('mb_menu_items');
  return safeParseJSON(item, DEFAULT_MENU_ITEMS);
};

export const getEmployees = (): Employee[] => {
  const item = safeGetItem('mb_employees');
  return safeParseJSON(item, DEFAULT_EMPLOYEES);
};

export const getOrders = (): Order[] => {
  const item = safeGetItem('mb_orders');
  return safeParseJSON(item, []);
};

export const getSales = (): DailySale[] => {
  const item = safeGetItem('mb_sales');
  return safeParseJSON(item, []);
};

export const saveStoreInfo = (info: StoreInfo) => {
  safeSetItem('mb_store_info', JSON.stringify(info));
};

export const saveMenuItems = (items: MenuItem[]) => {
  safeSetItem('mb_menu_items', JSON.stringify(items));
};

export const saveEmployees = (employees: Employee[]) => {
  safeSetItem('mb_employees', JSON.stringify(employees));
};

export const saveOrders = (orders: Order[]) => {
  safeSetItem('mb_orders', JSON.stringify(orders));
};

export const saveSales = (sales: DailySale[]) => {
  safeSetItem('mb_sales', JSON.stringify(sales));
};

initializeLocalStorage();
