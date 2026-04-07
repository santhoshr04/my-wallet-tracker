// Supabase Edge Function: import-bundle
// Imports admin bundles (schema v2): profiles, debts, debt_payments, transactions — with ID remapping.
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Profile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at?: string;
};

type TxRow = Record<string, unknown> & {
  type: string;
  amount: number;
  category: string;
  date: string;
  description?: string | null;
  transaction_time?: string | null;
  debt_id?: string | null;
  debt_payment_id?: string | null;
};

type DebtRow = Record<string, unknown> & {
  id?: string;
  direction: string;
  amount: number;
  remaining_amount: number;
  person_name: string;
  due_date?: string | null;
  description?: string | null;
  status: string;
  transaction_date?: string;
  transaction_time?: string;
  created_at?: string;
};

type DebtPaymentRow = Record<string, unknown> & {
  id?: string;
  debt_id: string;
  amount: number;
  occurred_date: string;
  occurred_time: string;
  note?: string | null;
};

type BundleUser = {
  profile: Profile;
  transactions: TxRow[];
  debts: DebtRow[];
  debt_payments?: DebtPaymentRow[];
};

type ExportBundle = {
  exported_at: string;
  schema_version: 1 | 2;
  users: BundleUser[];
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

function isBundle(v: any): v is ExportBundle {
  return (v?.schema_version === 1 || v?.schema_version === 2) && Array.isArray(v?.users);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: 'Missing Supabase environment variables' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const authed = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error: authErr } = await authed.auth.getUser();
  if (authErr || !authData?.user) return json(401, { error: 'Unauthorized' });

  const { data: roles, error: roleErr } = await authed.from('user_roles').select('role').eq('user_id', authData.user.id);
  if (roleErr) return json(403, { error: 'Role check failed' });
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === 'admin');
  if (!isAdmin) return json(403, { error: 'Admin only' });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  if (!isBundle(raw)) return json(400, { error: 'Unsupported bundle format' });

  const bundle = raw;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const report = {
    created_users: 0,
    matched_users: 0,
    imported_transactions: 0,
    imported_debts: 0,
    imported_debt_payments: 0,
    skipped: [] as Array<{ email: string | null; reason: string }>,
  };

  for (const u of bundle.users) {
    const email = (u.profile?.email ?? null)?.trim?.() ? String(u.profile.email).trim() : null;
    if (!email) {
      report.skipped.push({ email: null, reason: 'Missing email' });
      continue;
    }

    let targetUserId: string | null = null;
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) return json(500, { error: `Failed listing users: ${listErr.message}` });
    const existing = (list?.users ?? []).find((x) => (x.email ?? '').toLowerCase() === email.toLowerCase());

    if (existing) {
      targetUserId = existing.id;
      report.matched_users += 1;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { display_name: u.profile?.display_name ?? null },
      });
      if (createErr || !created?.user) {
        report.skipped.push({ email, reason: `Failed to create user: ${createErr?.message ?? 'unknown'}` });
        continue;
      }
      targetUserId = created.user.id;
      report.created_users += 1;
      await admin.from('user_roles').insert({ user_id: targetUserId, role: 'user' });
    }

    await admin.from('profiles').upsert({
      user_id: targetUserId,
      email,
      display_name: u.profile?.display_name ?? null,
    }, { onConflict: 'user_id' });

    const debtIdMap = new Map<string, string>();
    const paymentIdMap = new Map<string, string>();

    for (const d of u.debts ?? []) {
      const oldId = typeof d.id === 'string' ? d.id : undefined;
      const created = d.created_at as string | undefined;
      const txd = (d.transaction_date as string | undefined) ?? (created ? created.split('T')[0] : undefined) ??
        new Date().toISOString().split('T')[0];
      const txt = (d.transaction_time as string | undefined) ?? '12:00:00';

      const insert = {
        user_id: targetUserId,
        direction: d.direction,
        amount: d.amount,
        remaining_amount: d.remaining_amount,
        person_name: d.person_name,
        due_date: d.due_date ?? null,
        description: d.description ?? null,
        status: d.status,
        transaction_date: txd,
        transaction_time: typeof txt === 'string' && txt.length <= 5 ? `${txt}:00` : txt,
      };

      const { data: ins, error: dErr } = await admin.from('debts').insert(insert).select('id').single();
      if (dErr) {
        return json(500, { error: `Failed importing debt for ${email}: ${dErr.message}` });
      }
      if (oldId && ins?.id) debtIdMap.set(oldId, ins.id as string);
      report.imported_debts += 1;
    }

    for (const p of u.debt_payments ?? []) {
      const oldPayId = typeof p.id === 'string' ? p.id : undefined;
      const newDebtId = debtIdMap.get(p.debt_id as string);
      if (!newDebtId) continue;

      const occRaw = String(p.occurred_time ?? '12:00:00');
      const occNorm = occRaw.length === 5 ? `${occRaw}:00` : occRaw;

      const insPay = {
        debt_id: newDebtId,
        user_id: targetUserId,
        amount: p.amount,
        occurred_date: p.occurred_date,
        occurred_time: occNorm,
        note: p.note ?? null,
      };

      const { data: payRow, error: pErr } = await admin.from('debt_payments').insert(insPay).select('id').single();
      if (pErr) {
        return json(500, { error: `Failed importing debt_payment for ${email}: ${pErr.message}` });
      }
      if (oldPayId && payRow?.id) paymentIdMap.set(oldPayId, payRow.id as string);
      report.imported_debt_payments += 1;
    }

    const txRows = (u.transactions ?? []).map((t) => {
      const oid = t.debt_id as string | null | undefined;
      const opid = t.debt_payment_id as string | null | undefined;
      return {
        user_id: targetUserId,
        type: t.type,
        amount: t.amount,
        category: t.category,
        date: t.date,
        description: t.description ?? null,
        transaction_time: t.transaction_time ?? null,
        debt_id: oid ? debtIdMap.get(oid) ?? null : null,
        debt_payment_id: opid ? paymentIdMap.get(opid) ?? null : null,
      };
    });

    if (txRows.length) {
      const { error: txErr } = await admin.from('transactions').insert(txRows);
      if (txErr) return json(500, { error: `Failed importing transactions for ${email}: ${txErr.message}` });
      report.imported_transactions += txRows.length;
    }
  }

  return json(200, { ok: true, report });
});
