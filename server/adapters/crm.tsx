import customers from '../data/customers.json' with { type: 'json' };
import { getIntegrationAccessToken } from './integrations.js';
import type { Customer, CustomerLookup } from '../types.js';

type CustomerLookupOptions = {
  userId?: string;
};

type HubSpotContactResponse = {
  id?: string;
  properties?: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
  };
};

type HubSpotSearchResponse = {
  results?: HubSpotContactResponse[];
};

export async function findCustomer(lookup: CustomerLookup = {}, options: CustomerLookupOptions = {}): Promise<Customer | null> {
  const { phone, email, customerId } = lookup;
  if (!phone && !email && !customerId) return null;

  const hubSpotCustomer = await findHubSpotCustomer(lookup, options.userId);
  if (hubSpotCustomer) {
    return hubSpotCustomer;
  }

  return findLocalCustomer(lookup);
}

function findLocalCustomer({ phone, email, customerId }: CustomerLookup = {}) {
  return (customers as Customer[]).find((customer) => {
    return (
      (customerId && customer.id === customerId) ||
      (phone && customer.phone === phone) ||
      (email && customer.email.toLowerCase() === String(email).toLowerCase())
    );
  }) || null;
}

async function findHubSpotCustomer(lookup: CustomerLookup, userId?: string): Promise<Customer | null> {
  if (!userId) {
    return null;
  }

  try {
    const accessToken = getIntegrationAccessToken(userId, 'hubspot');
    if (!accessToken) {
      return null;
    }

    if (lookup.customerId) {
      const byId = await fetchHubSpotContactById(accessToken, lookup.customerId);
      if (byId) {
        return byId;
      }
    }

    if (lookup.email) {
      const byEmail = await searchHubSpotContact(accessToken, 'email', lookup.email);
      if (byEmail) {
        return byEmail;
      }
    }

    if (lookup.phone) {
      const byPhone = await searchHubSpotContact(accessToken, 'phone', lookup.phone);
      if (byPhone) {
        return byPhone;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`HubSpot CRM lookup failed; using local customer fallback. ${message}`);
  }

  return null;
}

async function fetchHubSpotContactById(accessToken: string, customerId: string) {
  const hubSpotId = customerId.replace(/^hubspot:/, '');
  const url = new URL(`https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(hubSpotId)}`);
  url.searchParams.set('properties', 'firstname,lastname,email,phone,lifecyclestage,hs_lead_status');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`HubSpot contact lookup failed: ${response.status}`);
  }

  return serializeHubSpotContact(await response.json() as HubSpotContactResponse);
}

async function searchHubSpotContact(accessToken: string, propertyName: 'email' | 'phone', value: string) {
  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filterGroups: [{
        filters: [{
          propertyName,
          operator: 'EQ',
          value,
        }],
      }],
      properties: ['firstname', 'lastname', 'email', 'phone', 'lifecyclestage', 'hs_lead_status'],
      limit: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`HubSpot contact search failed: ${response.status}`);
  }

  const payload = await response.json() as HubSpotSearchResponse;
  return payload.results?.[0] ? serializeHubSpotContact(payload.results[0]) : null;
}

export function serializeHubSpotContact(contact: HubSpotContactResponse): Customer {
  const properties = contact.properties || {};
  const name = [properties.firstname, properties.lastname].filter(Boolean).join(' ').trim();

  return {
    id: `hubspot:${contact.id || 'unknown'}`,
    name: name || properties.email || 'HubSpot contact',
    phone: properties.phone || '',
    email: properties.email || '',
    tier: hubSpotTier(properties),
    openTickets: [],
  };
}

function hubSpotTier(properties: HubSpotContactResponse['properties']) {
  const lifecycleStage = String(properties?.lifecyclestage || '').toLowerCase();
  const leadStatus = String(properties?.hs_lead_status || '').toLowerCase();

  if (/customer|opportunity|vip|active/.test(`${lifecycleStage} ${leadStatus}`)) {
    return 'customer';
  }

  return lifecycleStage || 'standard';
}
