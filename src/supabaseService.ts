import { supabase, isSupabaseConfigured } from './supabaseClient';
import { StoreInfo, MenuItem, Employee, Order, OrderItem, DailySale } from './types';

// Retorna se o Supabase está ativo para uso
export const checkSupabase = () => isSupabaseConfigured && supabase !== null;

// Buscar informações da loja (por simplicidade, pegamos a primeira cadastrada)
export const fetchStoreInfo = async (): Promise<StoreInfo | null> => {
  if (!checkSupabase()) return null;
  const { data, error } = await supabase!
    .from('stores')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Erro ao buscar dados da loja no Supabase:', error);
    return null;
  }
  
  return {
    name: data.name,
    logoUrl: data.logo_url,
    address: data.address,
    phone: data.phone,
    tablesCount: data.tables_count,
    serviceChargePercent: Number(data.service_charge_percent)
  };
};

// Atualizar dados da loja
export const updateStoreInfoSupabase = async (info: StoreInfo): Promise<boolean> => {
  if (!checkSupabase()) return false;
  // Pegamos a primeira loja para atualizar
  const { data: stores } = await supabase!.from('stores').select('id').limit(1);
  if (!stores || stores.length === 0) return false;

  const { error } = await supabase!
    .from('stores')
    .update({
      name: info.name,
      logo_url: info.logoUrl,
      address: info.address,
      phone: info.phone,
      tables_count: info.tablesCount,
      service_charge_percent: info.serviceChargePercent
    })
    .eq('id', stores[0].id);

  if (error) {
    console.error('Erro ao atualizar loja:', error);
    return false;
  }
  return true;
};

// Buscar cardápio
export const fetchMenuItems = async (): Promise<MenuItem[]> => {
  if (!checkSupabase()) return [];
  const { data, error } = await supabase!
    .from('menu_items')
    .select('*');

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

// Adicionar item ao cardápio
export const addMenuItemSupabase = async (item: Omit<MenuItem, 'id'>): Promise<MenuItem | null> => {
  if (!checkSupabase()) return null;
  
  const { data: stores } = await supabase!.from('stores').select('id').limit(1);
  if (!stores || stores.length === 0) return null;

  const { data, error } = await supabase!
    .from('menu_items')
    .insert([{
      store_id: stores[0].id,
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

// Buscar funcionários
export const fetchEmployees = async (): Promise<Employee[]> => {
  if (!checkSupabase()) return [];
  const { data, error } = await supabase!
    .from('employees')
    .select('*');

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

// Adicionar funcionário
export const addEmployeeSupabase = async (emp: Omit<Employee, 'id'>): Promise<Employee | null> => {
  if (!checkSupabase()) return null;
  const { data: stores } = await supabase!.from('stores').select('id').limit(1);
  if (!stores || stores.length === 0) return null;

  const { data, error } = await supabase!
    .from('employees')
    .insert([{
      store_id: stores[0].id,
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

// Buscar todos os pedidos ativos e itens
export const fetchOrders = async (): Promise<Order[]> => {
  if (!checkSupabase()) return [];
  
  // Buscar pedidos ativos ou completados recentes
  const { data: ordersData, error: ordersError } = await supabase!
    .from('orders')
    .select('*, order_items(*)');

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

// Adicionar novo pedido com itens
export const addOrderSupabase = async (order: Order): Promise<boolean> => {
  if (!checkSupabase()) return false;
  
  const { data: stores } = await supabase!.from('stores').select('id').limit(1);
  if (!stores || stores.length === 0) return false;

  const { data: newOrder, error: orderError } = await supabase!
    .from('orders')
    .insert([{
      id: order.id,
      store_id: stores[0].id,
      table_number: order.tableNumber,
      waiter_id: order.waiterId || null,
      waiter_name: order.waiterName,
      status: order.status,
      subtotal: order.subtotal,
      service_charge: order.serviceCharge,
      discount: order.discount,
      total: order.total
    }])
    .select()
    .single();

  if (orderError) {
    console.error('Erro ao registrar pedido:', orderError);
    return false;
  }

  // Inserir os itens do pedido
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

// Atualizar pedido (itens adicionados ou status alterados)
export const updateOrderSupabase = async (order: Order): Promise<boolean> => {
  if (!checkSupabase()) return false;

  // Atualiza dados da ordem principal (subtotal, etc.)
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

  // Para itens, inserimos ou atualizamos
  // Para simplificar: deletamos os order_items existentes e inserimos a lista atualizada
  // (Isso é extremamente seguro para mock/MVP e evita conflitos de chaves)
  await supabase!.from('order_items').delete().eq('order_id', order.id);

  const itemsToInsert = order.items.map(item => ({
    id: item.id.startsWith('oi_') ? undefined : item.id, // Se for temporário, deixa o Supabase gerar uuid
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

// Registrar fechamento de caixa e gerar dados de vendas agregados
export const fetchSalesSupabase = async (): Promise<DailySale[]> => {
  if (!checkSupabase()) return [];

  // Puxar pedidos com status 'completed' e agrupar por data
  const { data, error } = await supabase!
    .from('orders')
    .select('*')
    .eq('status', 'completed');

  if (error) {
    console.error('Erro ao calcular vendas diárias:', error);
    return [];
  }

  // Agrupamento manual para gerar a estrutura de DailySale exigida no dashboard
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
