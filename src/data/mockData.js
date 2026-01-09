// Demo mode storage keys
const DEMO_CONTRACTS_KEY = 'demo_contracts';
const DEMO_COMMENTS_KEY = 'demo_comments';
const DEMO_PHASES_KEY = 'demo_phases';
const DEMO_FILES_KEY = 'demo_files';
const DEMO_APPROVALS_KEY = 'demo_approvals';

// Initial mock contracts
const INITIAL_MOCK_CONTRACTS = [
  {
    id: 'demo-contract-1',
    title_i18n: 'demoSamples.projects.sample_contract_1',
    description_i18n: 'demoSamples.projects.sample_contract_1_description',
    status: 'approved',
    author: 'Demo User',
    author_id: 'demo-user-id',
    version: '1.0',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Complete redesign of the corporate website including responsive design, new branding, and improved user experience.',
    contract_value: 15000,
    client_name: 'Acme Corp',
    client_email: 'contact@acmecorp.com',
    category: 'Services',
  },
  {
    id: 'demo-contract-2',
    title_i18n: 'demoSamples.projects.sample_contract_2',
    description_i18n: 'demoSamples.projects.sample_contract_2_description',
    status: 'pending',
    author: 'Demo User',
    author_id: 'demo-user-id',
    version: '2.1',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Annual software license for internal development tools and IDE subscriptions.',
    contract_value: 5000,
    client_name: 'TechStart Inc',
    client_email: 'legal@techstart.io',
    category: 'License',
  },
  {
    id: 'demo-contract-3',
    title_i18n: 'demoSamples.projects.sample_contract_3',
    description_i18n: 'demoSamples.projects.sample_contract_3_description',
    status: 'draft',
    author: 'Demo User',
    author_id: 'demo-user-id',
    version: '0.1',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: null,
    description: 'Draft for upcoming consulting engagement covering digital transformation strategy.',
    contract_value: 25000,
    client_name: 'Global Solutions Ltd',
    client_email: 'projects@globalsolutions.com',
    category: 'Consulting',
  },
  {
    id: 'demo-contract-4',
    title_i18n: 'demoSamples.projects.sample_contract_4',
    description_i18n: 'demoSamples.projects.sample_contract_4_description',
    status: 'expiring',
    author: 'Demo User',
    author_id: 'demo-user-id',
    version: 'Final',
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Lease agreement for downtown office space at 123 Business Ave.',
    contract_value: 120000,
    client_name: 'City Properties LLC',
    client_email: 'leasing@cityproperties.com',
    category: 'Real Estate',
  },
  {
    id: 'demo-contract-5',
    title_i18n: 'demoSamples.projects.sample_contract_5',
    description_i18n: 'demoSamples.projects.sample_contract_5_description',
    status: 'expired',
    author: 'Demo User',
    author_id: 'demo-user-id',
    version: '1.0',
    created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Annual HVAC maintenance agreement for office building.',
    contract_value: 2000,
    client_name: 'CoolAir Systems',
    client_email: 'service@coolairsystems.com',
    category: 'Maintenance',
  },
  {
    id: 'demo-contract-6',
    title_i18n: 'demoSamples.projects.sample_contract_6',
    description_i18n: 'demoSamples.projects.sample_contract_6_description',
    status: 'approved',
    author: 'Demo User',
    author_id: 'demo-user-id',
    version: '1.2',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Q1 marketing campaign including social media, PPC, and content marketing.',
    contract_value: 35000,
    client_name: 'BrandBoost Agency',
    client_email: 'campaigns@brandboost.com',
    category: 'Marketing',
  },
];

// Initial mock comments
const INITIAL_MOCK_COMMENTS = [
  {
    id: 'demo-comment-1',
    contract_id: 'demo-contract-1',
    user_id: 'demo-user-id',
    user_name: 'Demo User',
    content: 'Contract has been reviewed and approved by legal team.',
    content_i18n: 'demoSamples.comments.comment_1',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-comment-2',
    contract_id: 'demo-contract-2',
    user_id: 'demo-user-id',
    user_name: 'Demo User',
    content: 'Waiting for client signature on the updated terms.',
    content_i18n: 'demoSamples.comments.comment_2',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-comment-3',
    contract_id: 'demo-contract-4',
    user_id: 'demo-user-id',
    user_name: 'Demo User',
    content: 'Lease expires soon! Need to negotiate renewal terms.',
    content_i18n: 'demoSamples.comments.comment_3',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Initial mock phases
const INITIAL_MOCK_PHASES = [
  {
    id: 'demo-phase-1',
    contract_id: 'demo-contract-1',
    phase_number: 1,
    name: 'Discovery & Planning',
    name_i18n: 'demoSamples.phases.phase_1',
    status: 'completed',
    start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-phase-2',
    contract_id: 'demo-contract-1',
    phase_number: 2,
    name: 'Design & Development',
    name_i18n: 'demoSamples.phases.phase_2',
    status: 'in_progress',
    start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-phase-3',
    contract_id: 'demo-contract-1',
    phase_number: 3,
    name: 'Testing & Launch',
    name_i18n: 'demoSamples.phases.phase_3',
    status: 'pending',
    start_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Initial mock approvals
const INITIAL_MOCK_APPROVALS = [
  {
    id: 'demo-approval-1',
    contract_id: 'demo-contract-2',
    requested_by: 'demo-user-id',
    requested_by_name: 'Demo User',
    status: 'pending',
    message: 'Please review and approve the updated license terms.',
    message_i18n: 'demoSamples.approvals.approval_1',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Initial mock files (sample files for demo contracts)
const INITIAL_MOCK_FILES = [
  {
    id: 'demo-file-1',
    name: 'contract-agreement.pdf',
    name_i18n: 'demoSamples.files.file_1',
    path: 'uploads/demo-contract-1/contract-agreement.pdf',
    size: 245000,
    type: 'application/pdf',
    contractId: 'demo-contract-1',
    uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'pdf'
  },
  {
    id: 'demo-file-2',
    name: 'design-mockups.zip',
    name_i18n: 'demoSamples.files.file_2',
    path: 'uploads/demo-contract-1/design-mockups.zip',
    size: 15000000,
    type: 'application/zip',
    contractId: 'demo-contract-1',
    uploadedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'archive'
  },
  {
    id: 'demo-file-3',
    name: 'license-terms.docx',
    name_i18n: 'demoSamples.files.file_3',
    path: 'uploads/demo-contract-2/license-terms.docx',
    size: 85000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    contractId: 'demo-contract-2',
    uploadedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'office'
  },
  {
    id: 'demo-file-4',
    name: 'budget-breakdown.xlsx',
    name_i18n: 'demoSamples.files.file_4',
    path: 'uploads/demo-contract-3/budget-breakdown.xlsx',
    size: 125000,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    contractId: 'demo-contract-3',
    uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'office'
  },
  {
    id: 'demo-file-5',
    name: 'project-logo.png',
    name_i18n: 'demoSamples.files.file_5',
    path: 'uploads/demo-contract-1/project-logo.png',
    size: 450000,
    type: 'image/png',
    contractId: 'demo-contract-1',
    uploadedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'image'
  },
];

// Mock user
export const MOCK_USER = {
  id: 'demo-user-id',
  email: 'demo@example.com',
  role: 'admin',
  full_name: 'Demo User'
};

// Helper functions for demo data management
export const getDemoContracts = () => {
  const stored = localStorage.getItem(DEMO_CONTRACTS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Merge missing i18n keys from defaults so translations resolve
      const defaultsById = (INITIAL_MOCK_CONTRACTS || []).reduce((acc, c) => {
        if (c && c.id) acc[c.id] = c;
        return acc;
      }, {});

      const merged = parsed.map(item => {
        const def = defaultsById[item.id] || {};
        return {
          // Defaults first, then stored values override runtime fields
          ...def,
          ...item,
          // Ensure i18n keys exist when available in defaults
          title_i18n: item.title_i18n || def.title_i18n,
          description_i18n: item.description_i18n || def.description_i18n,
        };
      });

      // Persist merged back to localStorage to keep consistency
      localStorage.setItem(DEMO_CONTRACTS_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Failed to parse stored demo contracts, resetting to defaults', e);
      localStorage.setItem(DEMO_CONTRACTS_KEY, JSON.stringify(INITIAL_MOCK_CONTRACTS));
      return INITIAL_MOCK_CONTRACTS;
    }
  }
  // Initialize with default data
  localStorage.setItem(DEMO_CONTRACTS_KEY, JSON.stringify(INITIAL_MOCK_CONTRACTS));
  return INITIAL_MOCK_CONTRACTS;
};

export const setDemoContracts = (contracts) => {
  localStorage.setItem(DEMO_CONTRACTS_KEY, JSON.stringify(contracts));
};

export const getDemoComments = () => {
  const stored = localStorage.getItem(DEMO_COMMENTS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(DEMO_COMMENTS_KEY, JSON.stringify(INITIAL_MOCK_COMMENTS));
  return INITIAL_MOCK_COMMENTS;
};

export const setDemoComments = (comments) => {
  localStorage.setItem(DEMO_COMMENTS_KEY, JSON.stringify(comments));
};

export const getDemoPhases = () => {
  const stored = localStorage.getItem(DEMO_PHASES_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(DEMO_PHASES_KEY, JSON.stringify(INITIAL_MOCK_PHASES));
  return INITIAL_MOCK_PHASES;
};

export const setDemoPhases = (phases) => {
  localStorage.setItem(DEMO_PHASES_KEY, JSON.stringify(phases));
};

export const getDemoFiles = () => {
  const stored = localStorage.getItem(DEMO_FILES_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(DEMO_FILES_KEY, JSON.stringify(INITIAL_MOCK_FILES));
  return INITIAL_MOCK_FILES;
};

export const setDemoFiles = (files) => {
  localStorage.setItem(DEMO_FILES_KEY, JSON.stringify(files));
};

export const getDemoApprovals = () => {
  const stored = localStorage.getItem(DEMO_APPROVALS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(DEMO_APPROVALS_KEY, JSON.stringify(INITIAL_MOCK_APPROVALS));
  return INITIAL_MOCK_APPROVALS;
};

export const setDemoApprovals = (approvals) => {
  localStorage.setItem(DEMO_APPROVALS_KEY, JSON.stringify(approvals));
};

// Reset all demo data to initial state
export const resetDemoData = () => {
  localStorage.setItem(DEMO_CONTRACTS_KEY, JSON.stringify(INITIAL_MOCK_CONTRACTS));
  localStorage.setItem(DEMO_COMMENTS_KEY, JSON.stringify(INITIAL_MOCK_COMMENTS));
  localStorage.setItem(DEMO_PHASES_KEY, JSON.stringify(INITIAL_MOCK_PHASES));
  localStorage.setItem(DEMO_FILES_KEY, JSON.stringify(INITIAL_MOCK_FILES));
  localStorage.setItem(DEMO_APPROVALS_KEY, JSON.stringify(INITIAL_MOCK_APPROVALS));
};

// Clear all demo data
export const clearDemoData = () => {
  localStorage.removeItem(DEMO_CONTRACTS_KEY);
  localStorage.removeItem(DEMO_COMMENTS_KEY);
  localStorage.removeItem(DEMO_PHASES_KEY);
  localStorage.removeItem(DEMO_FILES_KEY);
  localStorage.removeItem(DEMO_APPROVALS_KEY);
};

// Generate unique ID for demo items
export const generateDemoId = (prefix = 'demo') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Legacy export for backward compatibility
export const MOCK_CONTRACTS = INITIAL_MOCK_CONTRACTS;
