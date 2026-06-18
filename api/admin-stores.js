import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
};

const getAdminPassword = (req) =>
  req.headers['x-admin-password'] || req.headers['X-Admin-Password'] || '';

const assertAdmin = (req) => {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) return false;
  return getAdminPassword(req) === expectedPassword;
};

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente da Vercel.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const randomToken = () => crypto.randomBytes(32).toString('hex');

const buildInviteUrl = (req, storeId, token) => {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = req.headers.origin || `${protocol}://${host}`;
  return `${origin}/invite?store=${encodeURIComponent(storeId)}&token=${encodeURIComponent(token)}`;
};

const normalizeStore = (store, employeesData = [], menuData = [], ordersData = []) => {
  const storeEmployees = employeesData.filter(emp => emp.store_id === store.id);
  const storeMenuItems = menuData.filter(item => item.store_id === store.id);
  const storeOrders = ordersData.filter(order => order.store_id === store.id);
  const completedOrders = storeOrders.filter(order => order.status === 'completed');

  return {
    id: store.id,
    name: store.name,
    logoUrl: store.logo_url,
    address: store.address,
    phone: store.phone,
    tablesCount: Number(store.tables_count || 0),
    serviceChargePercent: Number(store.service_charge_percent || 0),
    tenantCode: store.tenant_code,
    themeColor: store.theme_color || 'teal',
    categories: store.categories || ['Bebidas', 'Petiscos', 'Sobremesas'],
    ownerEmail: store.owner_email,
    createdAt: store.created_at,
    employeesCount: storeEmployees.length,
    menuItemsCount: storeMenuItems.length,
    activeOrdersCount: storeOrders.filter(order => order.status === 'active').length,
    completedOrdersCount: completedOrders.length,
    totalRevenue: completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    invitePending: String(store.owner_password || '').startsWith('invite:')
  };
};

const listStores = async (supabase) => {
  const { data: storesData, error: storesError } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  if (storesError) throw storesError;

  const [{ data: employeesData }, { data: menuData }, { data: ordersData }] = await Promise.all([
    supabase.from('employees').select('id, store_id'),
    supabase.from('menu_items').select('id, store_id'),
    supabase.from('orders').select('id, store_id, status, total')
  ]);

  return (storesData || []).map(store =>
    normalizeStore(store, employeesData || [], menuData || [], ordersData || [])
  );
};

const createInvite = async (supabase, req, body) => {
  const token = randomToken();
  const tenantCode = `INV${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const label = String(body.clientName || body.name || '').trim();
  const inviteEmail = `invite-${crypto.randomBytes(8).toString('hex')}@maestriabeach.local`;

  const { data: store, error } = await supabase
    .from('stores')
    .insert([{
      name: label ? `Convite pendente - ${label}` : 'Convite pendente',
      tenant_code: tenantCode,
      owner_email: inviteEmail,
      owner_password: `invite:${sha256(token)}`,
      tables_count: 1,
      service_charge_percent: 10,
      logo_url: 'MB',
      address: 'Aguardando ativacao pelo dono da barraca',
      phone: String(body.phone || ''),
      theme_color: 'teal',
      categories: ['Bebidas', 'Petiscos', 'Sobremesas', 'Outros']
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    store: normalizeStore(store),
    inviteUrl: buildInviteUrl(req, store.id, token),
    token
  };
};

const getStoreDetails = async (supabase, storeId) => {
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();

  if (storeError) throw storeError;

  const [
    { data: employees },
    { data: menuItems },
    { data: orders }
  ] = await Promise.all([
    supabase.from('employees').select('*').eq('store_id', storeId).order('name'),
    supabase.from('menu_items').select('*').eq('store_id', storeId).order('category').order('name'),
    supabase.from('orders').select('*, order_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(50)
  ]);

  return {
    store: normalizeStore(store, employees || [], menuItems || [], orders || []),
    employees: employees || [],
    menuItems: menuItems || [],
    orders: orders || []
  };
};

const updateStore = async (supabase, storeId, body) => {
  const { error } = await supabase
    .from('stores')
    .update({
      name: body.name,
      logo_url: body.logoUrl,
      address: body.address,
      phone: body.phone,
      tables_count: Number(body.tablesCount || 0),
      service_charge_percent: Number(body.serviceChargePercent || 0),
      tenant_code: body.tenantCode,
      owner_email: body.ownerEmail,
      theme_color: body.themeColor || 'teal',
      categories: body.categories || ['Bebidas', 'Petiscos', 'Sobremesas']
    })
    .eq('id', storeId);

  if (error) throw error;
};

const deleteStore = async (supabase, storeId) => {
  const { data: ordersData, error: ordersFetchError } = await supabase
    .from('orders')
    .select('id')
    .eq('store_id', storeId);

  if (ordersFetchError) throw ordersFetchError;

  const orderIds = (ordersData || []).map(order => order.id);
  if (orderIds.length > 0) {
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .in('order_id', orderIds);

    if (orderItemsError) throw orderItemsError;
  }

  for (const tableName of ['orders', 'menu_items', 'employees']) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('store_id', storeId);

    if (error) throw error;
  }

  const { error: storeError } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId);

  if (storeError) throw storeError;
};

export default async function handler(req, res) {
  if (!assertAdmin(req)) {
    return res.status(401).json({ error: 'Senha admin invalida.' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const storeId = req.query?.id;

    if (req.method === 'GET') {
      if (storeId) {
        return res.status(200).json(await getStoreDetails(supabase, storeId));
      }

      return res.status(200).json({ stores: await listStores(supabase) });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      if (body.action !== 'create_invite') {
        return res.status(400).json({ error: 'Acao admin invalida.' });
      }

      return res.status(201).json(await createInvite(supabase, req, body));
    }

    if (req.method === 'PATCH') {
      if (!storeId) return res.status(400).json({ error: 'ID da barraca obrigatorio.' });
      const body = await readJsonBody(req);
      await updateStore(supabase, storeId, body);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!storeId) return res.status(400).json({ error: 'ID da barraca obrigatorio.' });
      await deleteStore(supabase, storeId);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  } catch (error) {
    console.error('Erro no admin-stores:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro inesperado no painel admin.'
    });
  }
}
