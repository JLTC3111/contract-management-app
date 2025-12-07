export const MOCK_CONTRACTS = [
  {
    id: 'mock-1',
    title: 'Website Redesign Contract',
    status: 'active',
    author: 'Demo User',
    version: '1.0',
    updated_at: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    description: 'Complete redesign of the corporate website.',
    contract_value: 15000,
    client_name: 'Acme Corp'
  },
  {
    id: 'mock-2',
    title: 'Software License Agreement',
    status: 'pending',
    author: 'Demo User',
    version: '2.1',
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Annual software license for internal tools.',
    contract_value: 5000,
    client_name: 'TechStart Inc'
  },
  {
    id: 'mock-3',
    title: 'Consulting Services',
    status: 'draft',
    author: 'Demo User',
    version: '0.1',
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: null,
    description: 'Draft for upcoming consulting engagement.',
    contract_value: 0,
    client_name: 'Global Solutions'
  },
  {
    id: 'mock-4',
    title: 'Office Lease',
    status: 'expiring',
    author: 'Demo User',
    version: 'Final',
    updated_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    description: 'Lease agreement for downtown office space.',
    contract_value: 120000,
    client_name: 'City Properties'
  },
  {
    id: 'mock-5',
    title: 'Maintenance Contract',
    status: 'expired',
    author: 'Demo User',
    version: '1.0',
    updated_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    description: 'HVAC maintenance agreement.',
    contract_value: 2000,
    client_name: 'CoolAir Systems'
  }
];

export const MOCK_USER = {
  id: 'demo-user-id',
  email: 'demo@example.com',
  role: 'admin',
  full_name: 'Demo User'
};
