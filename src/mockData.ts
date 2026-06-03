import { StoreInfo, MenuItem, Employee, Table, Order, DailySale } from './types';

export const DEFAULT_STORE_INFO: StoreInfo = {
  name: 'Maestria Beach Club',
  logoUrl: '🏖️',
  address: 'Avenida Beira Mar, 1000 - Ceará, Brasil',
  phone: '(85) 99999-8888',
  tablesCount: 15,
  serviceChargePercent: 10,
  themeColor: 'teal',
  categories: ['Bebidas', 'Petiscos', 'Sobremesas']
};

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Água de Coco Gelada',
    price: 8.00,
    description: 'Coco verde natural colhido no dia, servido trincando de gelado.',
    category: 'Bebidas',
    imageUrl: '🥥',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm2',
    name: 'Caipirinha Tradicional',
    price: 18.00,
    description: 'Cachaça artesanal, limão taity fresquinho, açúcar e bastante gelo.',
    category: 'Bebidas',
    imageUrl: '🍹',
    isAvailable: true,
    isPromotion: true,
    promotionalPrice: 15.00
  },
  {
    id: 'm3',
    name: 'Isca de Peixe Crocante',
    price: 55.00,
    description: 'Filé de peixe fresco empanado no panko, super crocante. Acompanha molho tártaro da casa.',
    category: 'Petiscos',
    imageUrl: '🐟',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm4',
    name: 'Camarão ao Alho e Óleo',
    price: 69.00,
    description: 'Camarões inteiros selecionados, dourados no azeite com alho laminado e salsinha.',
    category: 'Petiscos',
    imageUrl: '🍤',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm5',
    name: 'Pastel de Queijo Coalho (Porção)',
    price: 24.00,
    description: '6 unidades de mini pastéis recheados com queijo coalho nordestino derretido.',
    category: 'Petiscos',
    imageUrl: '🥟',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm6',
    name: 'Batata Frita Rústica',
    price: 28.00,
    description: 'Porção generosa de batatas fritas rústicas com alecrim e maionese de alho.',
    category: 'Petiscos',
    imageUrl: '🍟',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm7',
    name: 'Cerveja Long Neck Premium',
    price: 12.00,
    description: 'Heineken ou Corona trincando de gelada.',
    category: 'Bebidas',
    imageUrl: '🍺',
    isAvailable: true,
    isPromotion: false
  },
  {
    id: 'm8',
    name: 'Suco Natural de Maracujá',
    price: 10.00,
    description: 'Suco da fruta pura com ou sem açúcar (jarra ou copo).',
    category: 'Bebidas',
    imageUrl: '🥤',
    isAvailable: true,
    isPromotion: false
  }
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'e1',
    name: 'Dono (Administrador)',
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

// Memória local de fallback se o LocalStorage estiver inacessível ou lançar erro
const memoryStore: Record<string, any> = {
  mb_store_info: DEFAULT_STORE_INFO,
  mb_menu_items: DEFAULT_MENU_ITEMS,
  mb_employees: DEFAULT_EMPLOYEES,
  mb_orders: [],
  mb_sales: []
};

// Funções utilitárias seguras
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`LocalStorage inacessível para a chave "${key}". Usando fallback em memória.`, e);
    return JSON.stringify(memoryStore[key]);
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`LocalStorage bloqueado ao tentar salvar a chave "${key}". Salvando em memória.`, e);
  }
  try {
    memoryStore[key] = JSON.parse(value);
  } catch (err) {
    console.error('Erro ao salvar em memória auxiliar:', err);
  }
};

const safeParseJSON = (jsonString: string | null, fallbackValue: any): any => {
  if (!jsonString) return fallbackValue;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Erro de parse no JSON do LocalStorage. Resetando para valor padrão.', e);
    return fallbackValue;
  }
};

// Inicialização
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
  } catch (e) {
    console.error('Erro geral ao inicializar LocalStorage:', e);
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

// Executa a inicialização de forma imediata na carga do módulo
initializeLocalStorage();
