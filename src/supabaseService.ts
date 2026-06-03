import { supabase, isSupabaseConfigured } from './supabaseClient';
import { StoreInfo, MenuItem, Employee, Order, OrderItem, DailySale } from './types';

// Retorna se o Supabase está ativo para uso
export const checkSupabase = () => isSupabaseConfigured && supabase !== null;

// ==========================================
// FLUXOS DE AUTENTICAÇÃO SAAS (MULTI-TENANT)
// ==========================================

// 1. Cadastrar nova barraca de praia (Store + Admin Employee + Cardápio padrão)
export const registerNewStore = async (
  name: string,
  tenantCode: string,
  email: string,
  passwordStr: string
): Promise<{ store: StoreInfo; employee: Employee; storeId: string } | null> => {
  if (!checkSupabase()) return null;

  try {
    // 1. Inserir a loja
    const { data: storeData, error: storeError } = await supabase!
      .from('stores')
      .insert([{
        name: name,
        tenant_code: tenantCode.toUpperCase().trim(),
        owner_email: email.toLowerCase().trim(),
        owner_password: passwordStr,
        tables_count: 15,
        service_charge_percent: 10.00,
        logo_url: '🏖️'
      }])
      .select()
      .single();

    if (storeError) {
      console.error('Erro ao cadastrar barraca no Supabase:', storeError);
      throw new Error(storeError.message.includes('unique') ? 'Este código de barraca ou e-mail já está sendo usado.' : storeError.message);
    }

    const storeId = storeData.id;

    // 2. Inserir Dono administrativo padrão na equipe
    const { data: empData, error: empError } = await supabase!
      .from('employees')
      .insert([{
        store_id: storeId,
        name: 'Dono (Administrador)',
        role: 'cashier',
        pin: '0000'
      }])
      .select()
      .single();

    if (empError) {
      console.error('Erro ao cadastrar funcionário administrador:', empError);
      throw empError;
    }

    // 3. Inserir itens padrão de cardápio para facilitar no onboarding do lojista
    const defaultItems = [
      { store_id: storeId, name: 'Água de Coco Gelada', price: 8.00, description: 'Coco verde natural colhido no dia.', category: 'Bebidas', image_url: '🥥', is_available: true, is_promotion: false },
      { store_id: storeId, name: 'Caipirinha Tradicional', price: 18.00, description: 'Cachaça artesanal, limão e bastante gelo.', category: 'Bebidas', image_url: '🍹', is_available: true, is_promotion: true, promotional_price: 15.00 },
      { store_id: storeId, name: 'Isca de Peixe Crocante', price: 55.00, description: 'Empanado no panko com molho tártaro.', category: 'Petiscos', image_url: '🐟', is_available: true, is_promotion: false },
      { store_id: storeId, name: 'Camarão ao Alho e Óleo', price: 69.00, description: 'Camarões inteiros dourados no azeite com alho.', category: 'Petiscos', image_url: '🍤', is_available: true, is_promotion: false },
      { store_id: storeId, name: 'Pastel de Queijo Coalho', price: 24.00, description: '6 unidades de mini pastéis crocantes.', category: 'Petiscos', image_url: '🥟', is_available: true, is_promotion: false },
      { store_id: storeId, name: 'Batata Frita Rústica', price: 28.00, description: 'Porção rústica com alecrim.', category: 'Petiscos', image_url: '🍟', is_available: true, is_promotion: false }
    ];

    await supabase!.from('menu_items').insert(defaultItems);

    return {
      store: {
        name: storeData.name,
        logoUrl: storeData.logo_url,
        address: storeData.address,
        phone: storeData.phone,
        tablesCount: storeData.tables_count,
        serviceChargePercent: Number(storeData.service_charge_percent),
        themeColor: storeData.theme_color || 'teal',
        categories: storeData.categories || ['Bebidas', 'Petiscos', 'Sobremesas']
      },
      employee: {
        id: empData.id,
        name: empData.name,
        role: empData.role as any,
        pin: empData.pin
      },
      storeId: storeId
    };
  } catch (err: any) {
    alert(err.message || 'Erro durante o cadastro.');
    return null;
  }
};

// 2. Login do Dono (E-mail e Senha)
export const loginOwner = async (
  email: string,
  passwordStr: string
): Promise<{ store: StoreInfo; employee: Employee; storeId: string } | null> => {
  if (!checkSupabase()) return null;

  const { data: storeData, error: storeError } = await supabase!
    .from('stores')
    .select('*')
    .eq('owner_email', email.toLowerCase().trim())
    .eq('owner_password', passwordStr)
    .maybeSingle();

  if (storeError || !storeData) {
    console.error('Erro de autenticação do dono:', storeError);
    return null;
  }

  // Busca o funcionário do Dono administrativo
  const { data: empData, error: empError } = await supabase!
    .from('employees')
    .select('*')
    .eq('store_id', storeData.id)
    .eq('pin', '0000')
    .single();

  if (empError) {
    console.error('Erro ao carregar credencial de administrador:', empError);
    return null;
  }

  return {
    store: {
      name: storeData.name,
      logoUrl: storeData.logo_url,
      address: storeData.address,
      phone: storeData.phone,
      tablesCount: storeData.tables_count,
      serviceChargePercent: Number(storeData.service_charge_percent),
      tenantCode: storeData.tenant_code, // Exibe o código no painel
      themeColor: storeData.theme_color || 'teal',
      categories: storeData.categories || ['Bebidas', 'Petiscos', 'Sobremesas']
    },
    employee: {
      id: empData.id,
      name: empData.name,
      role: empData.role as any,
      pin: empData.pin
    },
    storeId: storeData.id
  };
};

// 3. Login de Funcionário (Código da Barraca + PIN de 4 dígitos)
export const loginEmployee = async (
  tenantCode: string,
  pin: string
): Promise<{ store: StoreInfo; employee: Employee; storeId: string } | null> => {
  if (!checkSupabase()) return null;

  // Busca a loja pelo código do inquilino
  const { data: storeData, error: storeError } = await supabase!
    .from('stores')
    .select('*')
    .eq('tenant_code', tenantCode.toUpperCase().trim())
    .maybeSingle();

  if (storeError || !storeData) {
    console.error('Barraca não encontrada pelo código informado:', storeError);
    return null;
  }

  // Busca o funcionário na loja correspondente com o PIN fornecido
  const { data: empData, error: empError } = await supabase!
    .from('employees')
    .select('*')
    .eq('store_id', storeData.id)
    .eq('pin', pin)
    .maybeSingle();

  if (empError || !empData) {
    console.error('Funcionário não cadastrado com este PIN nesta barraca:', empError);
    return null;
  }

  return {
    store: {
      name: storeData.name,
      logoUrl: storeData.logo_url,
      address: storeData.address,
      phone: storeData.phone,
      tablesCount: storeData.tables_count,
      serviceChargePercent: Number(storeData.service_charge_percent),
      themeColor: storeData.theme_color || 'teal',
      categories: storeData.categories || ['Bebidas', 'Petiscos', 'Sobremesas']
    },
    employee: {
      id: empData.id,
      name: empData.name,
      role: empData.role as any,
      pin: empData.pin
    },
    storeId: storeData.id
  };
};

// ==========================================
// FUNÇÕES DE BUSCA E EDIÇÃO POR STORE_ID
// ==========================================

// Buscar informações da loja por ID
export const fetchStoreInfo = async (storeId: string): Promise<StoreInfo | null> => {
  if (!checkSupabase()) return null;
  const { data, error } = await supabase!
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();

  if (error) {
    console.error('Erro ao buscar dados da loja:', error);
    return null;
  }
  
  return {
    name: data.name,
    logoUrl: data.logo_url,
    address: data.address,
    phone: data.phone,
    tablesCount: data.tables_count,
    serviceChargePercent: Number(data.service_charge_percent),
    tenantCode: data.tenant_code,
    themeColor: data.theme_color || 'teal',
    categories: data.categories || ['Bebidas', 'Petiscos', 'Sobremesas']
  };
};

// Atualizar dados da loja
export const updateStoreInfoSupabase = async (storeId: string, info: StoreInfo): Promise<boolean> => {
  if (!checkSupabase()) return false;

  const { error } = await supabase!
    .from('stores')
    .update({
      name: info.name,
      logo_url: info.logoUrl,
      address: info.address,
      phone: info.phone,
      tables_count: info.tablesCount,
      service_charge_percent: info.serviceChargePercent,
      theme_color: info.themeColor || 'teal',
      categories: info.categories || ['Bebidas', 'Petiscos', 'Sobremesas']
    })
    .eq('id', storeId);

  if (error) {
    console.error('Erro ao atualizar loja:', error);
    return false;
  }
  return true;
};

// Buscar cardápio da loja
export const fetchMenuItems = async (storeId: string): Promise<MenuItem[]> => {
  if (!checkSupabase()) return [];
  const { data, error } = await supabase!
    .from('menu_items')
    .select('*')
    .eq('store_id', storeId);

  if (error) {
    console.error('Erro ao buscar cardápio:', error);
    return [];
  }

  return data.map(item => ({
    id: item.id,
    name: item.name,
    price: Number(item.price),
    description: item.description,
    category: item.category,
    imageUrl: item.image_url,
    isAvailable: item.is_available,
    isPromotion: item.is_promotion,
    promotionalPrice: item.promotional_price ? Number(item.promotional_price) : undefined
  }));
};

// Adicionar item ao cardápio da loja
export const addMenuItemSupabase = async (storeId: string, item: Omit<MenuItem, 'id'>): Promise<MenuItem | null> => {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase!
    .from('menu_items')
    .insert([{
      store_id: storeId,
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category,
      image_url: item.imageUrl,
      is_available: item.isAvailable,
      is_promotion: item.isPromotion,
      promotional_price: item.promotionalPrice
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar item no cardápio:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    price: Number(data.price),
    description: data.description,
    category: data.category,
    imageUrl: data.image_url,
    isAvailable: data.is_available,
    isPromotion: data.is_promotion,
    promotionalPrice: data.promotional_price ? Number(data.promotional_price) : undefined
  };
};

// Deletar item do cardápio
export const deleteMenuItemSupabase = async (id: string): Promise<boolean> => {
  if (!checkSupabase()) return false;
  const { error } = await supabase!
    .from('menu_items')
    .delete()
    .eq('id', id);
    
  return !error;
};

// Buscar funcionários da loja
export const fetchEmployees = async (storeId: string): Promise<Employee[]> => {
  if (!checkSupabase()) return [];
  const { data, error } = await supabase!
    .from('employees')
    .select('*')
    .eq('store_id', storeId);

  if (error) {
    console.error('Erro ao buscar funcionários:', error);
    return [];
  }

  return data.map(emp => ({
    id: emp.id,
    name: emp.name,
    role: emp.role,
    pin: emp.pin
  }));
};

// Adicionar funcionário na loja
export const addEmployeeSupabase = async (storeId: string, emp: Omit<Employee, 'id'>): Promise<Employee | null> => {
  if (!checkSupabase()) return null;

  const { data, error } = await supabase!
    .from('employees')
    .insert([{
      store_id: storeId,
      name: emp.name,
      role: emp.role,
      pin: emp.pin
    }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar funcionário:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    role: data.role,
    pin: data.pin
  };
};

// Deletar funcionário
export const deleteEmployeeSupabase = async (id: string): Promise<boolean> => {
  if (!checkSupabase()) return false;
  const { error } = await supabase!
    .from('employees')
    .delete()
    .eq('id', id);

  return !error;
};

// Buscar pedidos da loja
export const fetchOrders = async (storeId: string): Promise<Order[]> => {
  if (!checkSupabase()) return [];
  
  const { data: ordersData, error: ordersError } = await supabase!
    .from('orders')
    .select('*, order_items(*)')
    .eq('store_id', storeId);

  if (ordersError) {
    console.error('Erro ao buscar pedidos:', ordersError);
    return [];
  }

  return ordersData.map(order => ({
    id: order.id,
    tableNumber: order.table_number,
    waiterId: order.waiter_id,
    waiterName: order.waiter_name,
    status: order.status,
    createdAt: order.created_at,
    completedAt: order.completed_at,
    paymentMethod: order.payment_method,
    subtotal: Number(order.subtotal),
    serviceCharge: Number(order.service_charge),
    discount: Number(order.discount),
    total: Number(order.total),
    items: (order.order_items || []).map((item: any) => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      observations: item.observations,
      status: item.status,
      sentAt: item.sent_at
    }))
  }));
};

// Adicionar pedido na loja
export const addOrderSupabase = async (storeId: string, order: Order): Promise<boolean> => {
  if (!checkSupabase()) return false;

  const { data: newOrder, error: orderError } = await supabase!
    .from('orders')
    .insert([{
      id: order.id,
      store_id: storeId,
      table_number: order.tableNumber,
      waiter_id: order.waiterId || null,
      waiter_name: order.waiterName,
      status: order.status,
      subtotal: order.subtotal,
      service_charge: order.serviceCharge,
      discount: order.discount,
      total: order.total,
      created_at: order.createdAt
    }])
    .select()
    .single();

  if (orderError) {
    console.error('Erro ao registrar pedido:', orderError);
    return false;
  }

  const itemsToInsert = order.items.map(item => ({
    order_id: newOrder.id,
    menu_item_id: item.menuItemId || null,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    observations: item.observations,
    status: item.status,
    sent_at: item.sentAt
  }));

  const { error: itemsError } = await supabase!
    .from('order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Erro ao registrar itens do pedido:', itemsError);
    return false;
  }

  return true;
};

// Atualizar pedido na loja
export const updateOrderSupabase = async (storeId: string, order: Order): Promise<boolean> => {
  if (!checkSupabase()) return false;

  const { error: orderError } = await supabase!
    .from('orders')
    .update({
      status: order.status,
      subtotal: order.subtotal,
      service_charge: order.serviceCharge,
      discount: order.discount,
      total: order.total,
      payment_method: order.paymentMethod,
      completed_at: order.completedAt
    })
    .eq('id', order.id);

  if (orderError) {
    console.error('Erro ao atualizar pedido:', orderError);
    return false;
  }

  // Substitui itens
  await supabase!.from('order_items').delete().eq('order_id', order.id);

  const itemsToInsert = order.items.map(item => ({
    id: item.id.startsWith('oi_') ? undefined : item.id,
    order_id: order.id,
    menu_item_id: item.menuItemId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    observations: item.observations,
    status: item.status,
    sent_at: item.sentAt
  }));

  const { error: itemsError } = await supabase!
    .from('order_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('Erro ao atualizar itens de pedido:', itemsError);
    return false;
  }

  return true;
};

// Buscar faturamento agregados da loja
export const fetchSalesSupabase = async (storeId: string): Promise<DailySale[]> => {
  if (!checkSupabase()) return [];

  const { data, error } = await supabase!
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'completed');

  if (error) {
    console.error('Erro ao calcular vendas diárias:', error);
    return [];
  }

  const groups: Record<string, DailySale> = {};

  data.forEach(order => {
    const dateKey = new Date(order.created_at).toLocaleDateString('pt-BR');
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        id: 'sale_' + dateKey,
        date: order.created_at,
        totalSales: 0,
        orderCount: 0,
        byPaymentMethod: { pix: 0, card: 0, cash: 0 }
      };
    }

    const value = Number(order.total);
    groups[dateKey].totalSales += value;
    groups[dateKey].orderCount += 1;
    
    if (order.payment_method === 'pix') groups[dateKey].byPaymentMethod.pix += value;
    if (order.payment_method === 'card') groups[dateKey].byPaymentMethod.card += value;
    if (order.payment_method === 'cash') groups[dateKey].byPaymentMethod.cash += value;
  });

  return Object.values(groups);
};
