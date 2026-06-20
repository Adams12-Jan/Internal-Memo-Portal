import { query } from '../db/db';

export interface Contact {
  id: string;
  created_by: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  department?: string;
  role?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  created_by: string;
  contact_id?: string;
  title: string;
  description?: string;
  amount?: number;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date?: string;
  closed_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  created_by: string;
  name: string;
  template_id?: string;
  subject?: string;
  body?: string;
  recipient_count: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

// ============ CONTACTS ============

export async function createContact(
  userId: string,
  contact: Partial<Contact>
): Promise<Contact> {
  const fullName = (contact.first_name || contact.last_name || (contact as any).name || '').trim();
  const nameParts = fullName.split(' ').filter(Boolean);
  const firstName = nameParts.shift() || 'Unknown';
  const lastName = nameParts.join(' ') || 'Staff';

  const result = await query(
    `INSERT INTO contacts (created_by, first_name, last_name, email, phone, company, job_title, department, role,
     address, city, state, zip_code, country, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
     RETURNING *`,
    [
      userId,
      firstName,
      lastName,
      contact.email,
      contact.phone,
      contact.company,
      contact.job_title,
      contact.department,
      contact.role,
      contact.address,
      contact.city,
      contact.state,
      contact.zip_code,
      contact.country,
      contact.notes
    ]
  );

  return result.rows[0];
}

export async function getContact(id: string): Promise<Contact | null> {
  const result = await query('SELECT * FROM contacts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getContactsByUser(userId: string, limit = 50, offset = 0): Promise<Contact[]> {
  const result = await query(
    'SELECT * FROM contacts WHERE created_by = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateContact(id: string, updates: Partial<Contact>): Promise<Contact> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const fields = ['first_name', 'last_name', 'email', 'phone', 'company', 'job_title',
    'department', 'role',
    'address', 'city', 'state', 'zip_code', 'country', 'notes', 'status'];

  for (const field of fields) {
    if (field in updates && (updates as any)[field] !== undefined) {
      setClauses.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (setClauses.length === 0) {
    return getContact(id) as Promise<Contact>;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE contacts SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function deleteContact(id: string): Promise<void> {
  await query('DELETE FROM contacts WHERE id = $1', [id]);
}

export async function searchContacts(userId: string, query_text: string): Promise<Contact[]> {
  const searchTerm = `%${query_text}%`;
  const result = await query(
    `SELECT * FROM contacts WHERE created_by = $1 AND 
     (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2)
     ORDER BY created_at DESC`,
    [userId, searchTerm]
  );
  return result.rows;
}

// ============ DEALS ============

export async function createDeal(userId: string, deal: Partial<Deal>): Promise<Deal> {
  const result = await query(
    `INSERT INTO deals (created_by, contact_id, title, description, amount, currency, stage, 
     probability, expected_close_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')
     RETURNING *`,
    [
      userId,
      deal.contact_id,
      deal.title,
      deal.description,
      deal.amount,
      deal.currency || 'USD',
      deal.stage || 'prospecting',
      deal.probability || 50,
      deal.expected_close_date
    ]
  );

  return result.rows[0];
}

export async function getDeal(id: string): Promise<Deal | null> {
  const result = await query('SELECT * FROM deals WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getDealsByUser(userId: string, limit = 50, offset = 0): Promise<Deal[]> {
  const result = await query(
    'SELECT * FROM deals WHERE created_by = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  return result.rows;
}

export async function getDealsByContact(contactId: string): Promise<Deal[]> {
  const result = await query(
    'SELECT * FROM deals WHERE contact_id = $1 ORDER BY created_at DESC',
    [contactId]
  );
  return result.rows;
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const fields = ['contact_id', 'title', 'description', 'amount', 'currency', 'stage',
    'probability', 'expected_close_date', 'closed_at', 'status'];

  for (const field of fields) {
    if (field in updates && (updates as any)[field] !== undefined) {
      setClauses.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (setClauses.length === 0) {
    return getDeal(id) as Promise<Deal>;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE deals SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function deleteDeal(id: string): Promise<void> {
  await query('DELETE FROM deals WHERE id = $1', [id]);
}

// ============ EMAIL CAMPAIGNS ============

export async function createEmailCampaign(
  userId: string,
  campaign: Partial<EmailCampaign>
): Promise<EmailCampaign> {
  const result = await query(
    `INSERT INTO email_campaigns (created_by, name, template_id, subject, body, status)
     VALUES ($1, $2, $3, $4, $5, 'draft')
     RETURNING *`,
    [userId, campaign.name, campaign.template_id, campaign.subject, campaign.body]
  );

  return result.rows[0];
}

export async function getCampaign(id: string): Promise<EmailCampaign | null> {
  const result = await query('SELECT * FROM email_campaigns WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getCampaignsByUser(userId: string, limit = 50, offset = 0): Promise<EmailCampaign[]> {
  const result = await query(
    'SELECT * FROM email_campaigns WHERE created_by = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  return result.rows;
}

export async function updateCampaign(id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  const fields = ['name', 'template_id', 'subject', 'body', 'status', 'scheduled_at', 'sent_at'];

  for (const field of fields) {
    if (field in updates && (updates as any)[field] !== undefined) {
      setClauses.push(`${field} = $${paramCount++}`);
      values.push((updates as any)[field]);
    }
  }

  if (setClauses.length === 0) {
    return getCampaign(id) as Promise<EmailCampaign>;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE email_campaigns SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function deleteCampaign(id: string): Promise<void> {
  await query('DELETE FROM email_campaigns WHERE id = $1', [id]);
}

// ============ AUDIT LOGGING ============

export async function logAuditEvent(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: any,
  newValues?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent
    ]
  );
}

export async function getAuditLogs(
  userId?: string,
  limit = 100,
  offset = 0
): Promise<any[]> {
  const params: any[] = [];
  let whereClause = '';
  
  if (userId) {
    params.push(userId);
    whereClause = 'WHERE user_id = $1';
  }

  const result = await query(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return result.rows;
}
