import express, { Request, Response } from 'express';
import {
  createContact,
  getContact,
  getContactsByUser,
  updateContact,
  deleteContact,
  searchContacts,
  createDeal,
  getDeal,
  getDealsByUser,
  getDealsByContact,
  updateDeal,
  deleteDeal,
  createEmailCampaign,
  getCampaign,
  getCampaignsByUser,
  updateCampaign,
  deleteCampaign,
  logAuditEvent
} from '../services/crmService';
import { authenticateToken } from './authRoutes';

const router = express.Router();

// Apply authentication to all CRM routes
router.use(authenticateToken);

const getUserId = (req: Request) => (req as any).userId;

// ============ CONTACTS ============

router.post('/crm/contacts', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const contact = await createContact(userId, req.body);

    await logAuditEvent(
      userId,
      'CONTACT_CREATED',
      'CONTACT',
      contact.id,
      null,
      contact,
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crm/contacts', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const contacts = await getContactsByUser(userId, limit, offset);
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crm/contacts/search', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const q = req.query.q as string;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const contacts = await searchContacts(userId, q);
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crm/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contact = await getContact(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (contact.created_by !== getUserId(req)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/crm/contacts/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const contact = await getContact(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (contact.created_by !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await updateContact(req.params.id, req.body);

    await logAuditEvent(
      userId,
      'CONTACT_UPDATED',
      'CONTACT',
      req.params.id,
      contact,
      updated,
      req.ip,
      req.get('user-agent')
    );

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/crm/contacts/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const contact = await getContact(req.params.id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (contact.created_by !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await deleteContact(req.params.id);

    await logAuditEvent(
      userId,
      'CONTACT_DELETED',
      'CONTACT',
      req.params.id,
      contact,
      null,
      req.ip,
      req.get('user-agent')
    );

    res.json({ message: 'Contact deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DEALS ============

router.post('/crm/deals', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const deal = await createDeal(userId, req.body);

    await logAuditEvent(
      userId,
      'DEAL_CREATED',
      'DEAL',
      deal.id,
      null,
      deal,
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json(deal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crm/deals', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const deals = await getDealsByUser(userId, limit, offset);
    res.json(deals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crm/deals/:id', async (req: Request, res: Response) => {
  try {
    const deal = await getDeal(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    if (deal.created_by !== getUserId(req)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(deal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crm/contacts/:contactId/deals', async (req: Request, res: Response) => {
  try {
    const deals = await getDealsByContact(req.params.contactId);
    res.json(deals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/crm/deals/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const deal = await getDeal(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    if (deal.created_by !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await updateDeal(req.params.id, req.body);

    await logAuditEvent(
      userId,
      'DEAL_UPDATED',
      'DEAL',
      req.params.id,
      deal,
      updated,
      req.ip,
      req.get('user-agent')
    );

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/crm/deals/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const deal = await getDeal(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    if (deal.created_by !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await deleteDeal(req.params.id);

    await logAuditEvent(
      userId,
      'DEAL_DELETED',
      'DEAL',
      req.params.id,
      deal,
      null,
      req.ip,
      req.get('user-agent')
    );

    res.json({ message: 'Deal deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EMAIL CAMPAIGNS ============

router.post('/crm/campaigns', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const campaign = await createEmailCampaign(userId, req.body);

    await logAuditEvent(
      userId,
      'CAMPAIGN_CREATED',
      'CAMPAIGN',
      campaign.id,
      null,
      campaign,
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crm/campaigns', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const campaigns = await getCampaignsByUser(userId, limit, offset);
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/crm/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await getCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.created_by !== getUserId(req)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/crm/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const campaign = await getCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.created_by !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await updateCampaign(req.params.id, req.body);

    await logAuditEvent(
      userId,
      'CAMPAIGN_UPDATED',
      'CAMPAIGN',
      req.params.id,
      campaign,
      updated,
      req.ip,
      req.get('user-agent')
    );

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/crm/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const campaign = await getCampaign(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.created_by !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await deleteCampaign(req.params.id);

    await logAuditEvent(
      userId,
      'CAMPAIGN_DELETED',
      'CAMPAIGN',
      req.params.id,
      campaign,
      null,
      req.ip,
      req.get('user-agent')
    );

    res.json({ message: 'Campaign deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
