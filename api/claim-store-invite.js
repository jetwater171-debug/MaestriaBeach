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

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

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

const mapStore = (store) => ({
  name: store.name,
  logoUrl: store.logo_url,
  address: store.address,
  phone: store.phone,
  tablesCount: Number(store.tables_count || 0),
  serviceChargePercent: Number(store.service_charge_percent || 0),
  tenantCode: store.tenant_code,
  themeColor: store.theme_color || 'teal',
  categories: store.categories || ['Bebidas', 'Petiscos', 'Sobremesas']
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  try {
    const body = await readJsonBody(req);
    const storeId = String(body.storeId || '').trim();
    const token = String(body.token || '').trim();
    const storeData = body.storeData || {};
    const ownerEmail = String(body.ownerEmail || '').trim().toLowerCase();
    const ownerPassword = String(body.ownerPassword || '');
    const employeesInput = Array.isArray(body.employeesInput) ? body.employeesInput : [];
    const menuItemsInput = Array.isArray(body.menuItemsInput) ? body.menuItemsInput : [];

    if (!storeId || !token) {
      return res.status(400).json({ error: 'Convite invalido.' });
    }

    if (!storeData.name || !storeData.tenantCode || !ownerEmail || ownerPassword.length < 4) {
      return res.status(400).json({ error: 'Preencha nome da barraca, codigo, e-mail e senha do dono.' });
    }

    const supabase = getSupabaseAdmin();
    const { data: inviteStore, error: inviteError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (inviteError || !inviteStore) {
      return res.status(404).json({ error: 'Convite nao encontrado.' });
    }

    const expectedInvitePassword = `invite:${sha256(token)}`;
    if (inviteStore.owner_password !== expectedInvitePassword) {
      return res.status(410).json({ error: 'Este link ja foi usado ou expirou.' });
    }

    const ownerPasswordHash = `sha256:${sha256(ownerPassword.trim())}`;
    const categories = storeData.categories || ['Bebidas', 'Petiscos', 'Sobremesas', 'Outros'];

    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update({
        name: String(storeData.name).trim(),
        tenant_code: String(storeData.tenantCode).trim().toUpperCase(),
        owner_email: ownerEmail,
        owner_password: ownerPasswordHash,
        tables_count: Number(storeData.tablesCount || 15),
        service_charge_percent: Number(storeData.serviceChargePercent || 10),
        logo_url: String(storeData.logoUrl || 'MB').trim(),
        address: String(storeData.address || '').trim(),
        phone: String(storeData.phone || '').trim(),
        theme_color: storeData.themeColor || 'teal',
        categories
      })
      .eq('id', storeId)
      .eq('owner_password', expectedInvitePassword)
      .select()
      .single();

    if (updateError) {
      const message = updateError.message?.includes('unique')
        ? 'Codigo da barraca ou e-mail ja esta em uso.'
        : updateError.message;
      throw new Error(message);
    }

    await Promise.all([
      supabase.from('employees').delete().eq('store_id', storeId),
      supabase.from('menu_items').delete().eq('store_id', storeId)
    ]);

    const employeesToInsert = [
      {
        store_id: storeId,
        name: 'Dono (Administrador)',
        role: 'cashier',
        pin: '0000'
      },
      ...employeesInput.map((employee) => ({
        store_id: storeId,
        name: String(employee.name || '').trim() || 'Funcionario',
        role: employee.role || 'waiter',
        pin: String(employee.pin || '').replace(/\D/g, '').slice(0, 4)
      }))
    ];

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .insert(employeesToInsert)
      .select();

    if (employeesError) throw employeesError;

    if (menuItemsInput.length > 0) {
      const menuToInsert = menuItemsInput.map((item) => ({
        store_id: storeId,
        name: String(item.name || '').trim() || 'Item',
        price: Number(item.price || 0),
        description: String(item.description || '').trim(),
        category: String(item.category || categories[0] || 'Petiscos').trim(),
        image_url: String(item.imageUrl || 'IT').trim(),
        is_available: item.isAvailable !== false,
        is_promotion: Boolean(item.isPromotion),
        promotional_price: item.promotionalPrice || null
      }));

      const { error: menuError } = await supabase.from('menu_items').insert(menuToInsert);
      if (menuError) throw menuError;
    }

    const ownerEmployee = employees.find((employee) => employee.pin === '0000') || employees[0];

    return res.status(200).json({
      store: mapStore(updatedStore),
      employee: {
        id: ownerEmployee.id,
        name: ownerEmployee.name,
        role: ownerEmployee.role,
        pin: ownerEmployee.pin
      },
      storeId
    });
  } catch (error) {
    console.error('Erro ao ativar convite:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro inesperado ao ativar convite.'
    });
  }
}
