/**
 * Contracts API Service
 * Centralized contract CRUD operations with Supabase
 * Supports Demo Mode with localStorage-based operations
 */

import { supabase } from '../utils/supaBaseClient';
import { 
  getDemoContracts, 
  setDemoContracts, 
  getDemoComments, 
  setDemoComments,
  getDemoPhases,
  setDemoPhases,
  getDemoApprovals,
  setDemoApprovals,
  generateDemoId 
} from '../data/mockData';

// Helper to check demo mode
const isDemoMode = () => localStorage.getItem('isDemoMode') === 'true';

/**
 * Demo Contracts API
 * All demo contract-related localStorage operations
 */
const demoContractsApi = {
  async getAll(options = {}) {
    let data = getDemoContracts();
    
    // Apply filters
    if (options.status && options.status !== 'all') {
      data = data.filter(c => c.status === options.status);
    }
    
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      data = data.filter(c => 
        c.title?.toLowerCase().includes(searchLower) ||
        c.author?.toLowerCase().includes(searchLower) ||
        c.client_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply ordering
    const orderBy = options.orderBy || 'updated_at';
    const ascending = options.ascending ?? false;
    data.sort((a, b) => {
      const aVal = a[orderBy] || '';
      const bVal = b[orderBy] || '';
      if (typeof aVal === 'string') {
        return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return ascending ? aVal - bVal : bVal - aVal;
    });
    
    // Apply pagination
    if (options.offset) {
      data = data.slice(options.offset);
    }
    if (options.limit) {
      data = data.slice(0, options.limit);
    }
    
    return data;
  },

  async getById(id) {
    const contracts = getDemoContracts();
    const contract = contracts.find(c => c.id === id);
    if (!contract) {
      throw new Error('Contract not found');
    }
    return contract;
  },

  async create(contract) {
    const contracts = getDemoContracts();
    const now = new Date().toISOString();
    const newContract = {
      ...contract,
      id: generateDemoId('contract'),
      created_at: now,
      updated_at: now,
      author: 'Demo User',
      author_id: 'demo-user-id',
    };
    contracts.unshift(newContract);
    setDemoContracts(contracts);
    return newContract;
  },

  async update(id, updates) {
    const contracts = getDemoContracts();
    const index = contracts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Contract not found');
    }
    contracts[index] = {
      ...contracts[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setDemoContracts(contracts);
    return contracts[index];
  },

  async updateStatus(id, status) {
    return this.update(id, { status });
  },

  async delete(id) {
    const contracts = getDemoContracts();
    const filtered = contracts.filter(c => c.id !== id);
    setDemoContracts(filtered);
    
    // Also delete related comments and phases
    const comments = getDemoComments().filter(c => c.contract_id !== id);
    setDemoComments(comments);
    
    const phases = getDemoPhases().filter(p => p.contract_id !== id);
    setDemoPhases(phases);
  },

  async getStatusCounts() {
    const contracts = getDemoContracts();
    const counts = {
      total: contracts.length,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      expiring: 0,
      expired: 0,
    };
    
    contracts.forEach(contract => {
      if (counts.hasOwnProperty(contract.status)) {
        counts[contract.status]++;
      }
    });
    
    return counts;
  },

  async getExpiring(days = 14) {
    const contracts = getDemoContracts();
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return contracts.filter(c => {
      if (!c.expiry_date) return false;
      const expiry = new Date(c.expiry_date);
      return expiry >= now && expiry <= futureDate;
    }).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  },

  async getRecent(limit = 5) {
    return this.getAll({ orderBy: 'updated_at', limit });
  },

  async search(searchTerm, options = {}) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }
    return this.getAll({ ...options, search: searchTerm });
  }
};

/**
 * Demo Phases API
 */
const demoPhasesApi = {
  async getByContractId(contractId) {
    const phases = getDemoPhases();
    return phases
      .filter(p => p.contract_id === contractId)
      .sort((a, b) => a.phase_number - b.phase_number);
  },

  async update(phaseId, updates) {
    const phases = getDemoPhases();
    const index = phases.findIndex(p => p.id === phaseId);
    if (index === -1) {
      throw new Error('Phase not found');
    }
    phases[index] = {
      ...phases[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setDemoPhases(phases);
    return phases[index];
  },

  async initialize(contractId, phaseDefs) {
    const phases = getDemoPhases();
    const newPhases = phaseDefs.map((phase, index) => ({
      ...phase,
      id: generateDemoId('phase'),
      contract_id: contractId,
      phase_number: index + 1,
      created_at: new Date().toISOString(),
    }));
    phases.push(...newPhases);
    setDemoPhases(phases);
    return newPhases;
  }
};

/**
 * Demo Comments API
 */
const demoCommentsApi = {
  async getByContractId(contractId) {
    const comments = getDemoComments();
    return comments
      .filter(c => c.contract_id === contractId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async create(comment) {
    const comments = getDemoComments();
    const newComment = {
      ...comment,
      id: generateDemoId('comment'),
      user_id: 'demo-user-id',
      user_name: 'Demo User',
      created_at: new Date().toISOString(),
    };
    comments.unshift(newComment);
    setDemoComments(comments);
    return newComment;
  },

  async delete(commentId) {
    const comments = getDemoComments();
    const filtered = comments.filter(c => c.id !== commentId);
    setDemoComments(filtered);
  }
};

/**
 * Demo Storage API (simulated file storage)
 */
const demoStorageApi = {
  async upload(path, file) {
    // In demo mode, we can't actually store files, but we can simulate it
    console.log('[Demo Mode] Simulated file upload:', path, file.name);
    return { 
      path, 
      id: generateDemoId('file'),
      name: file.name,
      size: file.size,
      type: file.type,
    };
  },

  async delete(path) {
    console.log('[Demo Mode] Simulated file delete:', path);
  },

  async getSignedUrl(path, expiresIn = 3600) {
    // Return a placeholder URL for demo mode
    console.log('[Demo Mode] Simulated signed URL request:', path);
    return null;
  },

  async listFiles(folder) {
    console.log('[Demo Mode] Simulated list files:', folder);
    return [];
  }
};

/**
 * Demo Approvals API
 */
const demoApprovalsApi = {
  async getAll() {
    return getDemoApprovals();
  },

  async getById(id) {
    const approvals = getDemoApprovals();
    return approvals.find(a => a.id === id) || null;
  },

  async getPending() {
    const approvals = getDemoApprovals();
    return approvals.filter(a => a.status === 'pending');
  },

  async create(approval) {
    const approvals = getDemoApprovals();
    const newApproval = {
      ...approval,
      id: generateDemoId('approval'),
      requested_by: approval.requester_id || 'demo-user-id',
      requested_by_name: 'Demo User',
      requester_email: approval.requester_email || 'demo@example.com',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    approvals.unshift(newApproval);
    setDemoApprovals(approvals);
    return newApproval;
  },

  async update(id, updates) {
    const approvals = getDemoApprovals();
    const index = approvals.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error('Approval not found');
    }
    approvals[index] = {
      ...approvals[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setDemoApprovals(approvals);
    return approvals[index];
  },

  async approve(approvalId, response) {
    const approvals = getDemoApprovals();
    const index = approvals.findIndex(a => a.id === approvalId);
    if (index === -1) {
      throw new Error('Approval not found');
    }
    approvals[index] = {
      ...approvals[index],
      status: 'approved',
      response,
      responded_at: new Date().toISOString(),
    };
    setDemoApprovals(approvals);
    
    // Also update the contract status
    const contracts = getDemoContracts();
    const contractIndex = contracts.findIndex(c => c.id === approvals[index].contract_id);
    if (contractIndex !== -1) {
      contracts[contractIndex].status = 'approved';
      contracts[contractIndex].updated_at = new Date().toISOString();
      setDemoContracts(contracts);
    }
    
    return approvals[index];
  },

  async reject(approvalId, response) {
    const approvals = getDemoApprovals();
    const index = approvals.findIndex(a => a.id === approvalId);
    if (index === -1) {
      throw new Error('Approval not found');
    }
    approvals[index] = {
      ...approvals[index],
      status: 'rejected',
      response,
      responded_at: new Date().toISOString(),
    };
    setDemoApprovals(approvals);
    
    // Also update the contract status
    const contracts = getDemoContracts();
    const contractIndex = contracts.findIndex(c => c.id === approvals[index].contract_id);
    if (contractIndex !== -1) {
      contracts[contractIndex].status = 'rejected';
      contracts[contractIndex].updated_at = new Date().toISOString();
      setDemoContracts(contracts);
    }
    
    return approvals[index];
  }
};

/**
 * Contracts API
 * All contract-related database operations
 * Automatically switches between demo and real mode
 */
export const contractsApi = {
  /**
   * Get all contracts
   * @param {object} options - Query options
   * @param {string} options.orderBy - Column to order by
   * @param {boolean} options.ascending - Sort ascending
   * @param {string} options.status - Filter by status
   * @param {string} options.search - Search term for title
   * @param {number} options.limit - Limit results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Array of contracts
   */
  async getAll(options = {}) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoContractsApi.getAll(options);
    }
    
    let query = supabase.from('contracts').select('*');
    
    // Apply filters
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    
    if (options.search) {
      query = query.ilike('title', `%${options.search}%`);
    }
    
    // Apply ordering
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    } else {
      query = query.order('updated_at', { ascending: false });
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single contract by ID
   * @param {number|string} id - Contract ID
   * @returns {Promise<object>} Contract object
   */
  async getById(id) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoContractsApi.getById(id);
    }
    
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new contract
   * @param {object} contract - Contract data
   * @returns {Promise<object>} Created contract
   */
  async create(contract) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoContractsApi.create(contract);
    }
    
    const now = new Date().toISOString();

    let { data, error } = await supabase
      .from('contracts')
      .insert({
        ...contract,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (error) {
      const message = error.message || '';
      const missingCreatedAt = message.includes("created_at") || message.includes('schema cache');
      if (missingCreatedAt) {
        ({ data, error } = await supabase
          .from('contracts')
          .insert({
            ...contract
          })
          .select()
          .single());
      }
    }

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing contract
   * @param {number|string} id - Contract ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated contract
   */
  async update(id, updates) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoContractsApi.update(id, updates);
    }
    
    const { data, error } = await supabase
      .from('contracts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Update contract status
   * @param {number|string} id - Contract ID
   * @param {string} status - New status
   * @returns {Promise<object>} Updated contract
   */
  async updateStatus(id, status) {
    return this.update(id, { status });
  },

  /**
   * Delete a contract
   * @param {number|string} id - Contract ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoContractsApi.delete(id);
    }
    
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * Get contracts count by status
   * @returns {Promise<object>} Status counts
   */
  async getStatusCounts() {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoContractsApi.getStatusCounts();
    }
    
    const { data, error } = await supabase
      .from('contracts')
      .select('status');
    
    if (error) throw error;
    
    const counts = {
      total: data?.length || 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      expiring: 0,
      expired: 0
    };
    
    data?.forEach(contract => {
      if (counts.hasOwnProperty(contract.status)) {
        counts[contract.status]++;
      }
    });
    
    return counts;
  },

  /**
   * Get contracts expiring within a certain number of days
   * @param {number} days - Number of days
   * @returns {Promise<Array>} Expiring contracts
   */
  async getExpiring(days = 14) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoContractsApi.getExpiring(days);
    }
    
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', futureDate.toISOString())
      .order('expiry_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Get recently updated contracts
   * @param {number} limit - Number of contracts to return
   * @returns {Promise<Array>} Recent contracts
   */
  async getRecent(limit = 5) {
    return this.getAll({ orderBy: 'updated_at', limit });
  },

  /**
   * Search contracts
   * @param {string} searchTerm - Search term
   * @param {object} options - Additional options
   * @returns {Promise<Array>} Matching contracts
   */
  async search(searchTerm, options = {}) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoContractsApi.search(searchTerm, options);
    }
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }
    
    let query = supabase
      .from('contracts')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
    
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    
    query = query.order('updated_at', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }
};

/**
 * Contract Phases API
 * Phase management operations
 */
export const phasesApi = {
  /**
   * Get phases for a contract
   * @param {number|string} contractId - Contract ID
   * @returns {Promise<Array>} Array of phases
   */
  async getByContractId(contractId) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoPhasesApi.getByContractId(contractId);
    }
    
    const { data, error } = await supabase
      .from('contract_phases')
      .select('*')
      .eq('contract_id', contractId)
      .order('phase_number');
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Update a phase
   * @param {number|string} phaseId - Phase ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated phase
   */
  async update(phaseId, updates) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoPhasesApi.update(phaseId, updates);
    }
    
    const { data, error } = await supabase
      .from('contract_phases')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', phaseId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Initialize default phases for a contract
   * @param {number|string} contractId - Contract ID
   * @param {Array} phases - Phase definitions
   * @returns {Promise<Array>} Created phases
   */
  async initialize(contractId, phases) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoPhasesApi.initialize(contractId, phases);
    }
    
    const { data, error } = await supabase
      .from('contract_phases')
      .insert(phases.map(phase => ({
        ...phase,
        contract_id: contractId
      })))
      .select();
    
    if (error) throw error;
    return data;
  }
};

/**
 * Comments API
 * Contract comment operations
 */
export const commentsApi = {
  /**
   * Get comments for a contract
   * @param {number|string} contractId - Contract ID
   * @returns {Promise<Array>} Array of comments
   */
  async getByContractId(contractId) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoCommentsApi.getByContractId(contractId);
    }
    
    const { data, error } = await supabase
      .from('contract_comments')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Add a comment
   * @param {object} comment - Comment data
   * @returns {Promise<object>} Created comment
   */
  async create(comment) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoCommentsApi.create(comment);
    }
    
    const { data, error } = await supabase
      .from('contract_comments')
      .insert({
        ...comment,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a comment
   * @param {number|string} commentId - Comment ID
   * @returns {Promise<void>}
   */
  async delete(commentId) {
    // Demo mode: use localStorage
    if (isDemoMode()) {
      return demoCommentsApi.delete(commentId);
    }
    
    const { error } = await supabase
      .from('contract_comments')
      .delete()
      .eq('id', commentId);
    
    if (error) throw error;
  }
};

/**
 * Storage API
 * File storage operations
 */
export const storageApi = {
  /**
   * Upload a file
   * @param {string} path - Storage path
   * @param {File} file - File to upload
   * @returns {Promise<object>} Upload result
   */
  async upload(path, file) {
    // Demo mode: simulate upload
    if (isDemoMode()) {
      return demoStorageApi.upload(path, file);
    }
    const { data, error } = await supabase.storage
      .from('contracts')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a file
   * @param {string} path - Storage path
   * @returns {Promise<void>}
   */
  async delete(path) {
    // Demo mode: simulate delete
    if (isDemoMode()) {
      return demoStorageApi.delete(path);
    }
    
    const { error } = await supabase.storage
      .from('contracts')
      .remove([path]);
    
    if (error) throw error;
  },

  /**
   * Get a signed URL for a file
   * @param {string} path - Storage path
   * @param {number} expiresIn - Expiry time in seconds
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(path, expiresIn = 3600) {
    // Demo mode: return null
    if (isDemoMode()) {
      return demoStorageApi.getSignedUrl(path, expiresIn);
    }
    
    const { data, error } = await supabase.storage
      .from('contracts')
      .createSignedUrl(path, expiresIn);
    
    if (error) throw error;
    return data?.signedUrl;
  },

  /**
   * List files in a folder
   * @param {string} folder - Folder path
   * @returns {Promise<Array>} Array of files
   */
  async listFiles(folder) {
    // Demo mode: return empty array
    if (isDemoMode()) {
      return demoStorageApi.listFiles(folder);
    }
    
    const { data, error } = await supabase.storage
      .from('contracts')
      .list(folder, {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) throw error;
    return data || [];
  }
};

/**
 * Approvals API
 * Approval request operations
 */
export const approvalsApi = {
  async getAll() {
    if (isDemoMode()) {
      return demoApprovalsApi.getAll();
    }
    // Real implementation would go here
    const { data, error } = await supabase
      .from('contract_approval_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    if (isDemoMode()) {
      return demoApprovalsApi.getById(id);
    }
    const { data, error } = await supabase
      .from('contract_approval_requests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getPending() {
    if (isDemoMode()) {
      return demoApprovalsApi.getPending();
    }
    const { data, error } = await supabase
      .from('contract_approval_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(approval) {
    if (isDemoMode()) {
      return demoApprovalsApi.create(approval);
    }
    const { data, error } = await supabase
      .from('contract_approval_requests')
      .insert({
        ...approval,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    if (isDemoMode()) {
      return demoApprovalsApi.update(id, updates);
    }
    const { data, error } = await supabase
      .from('contract_approval_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async approve(approvalId, response) {
    if (isDemoMode()) {
      return demoApprovalsApi.approve(approvalId, response);
    }
    const { data, error } = await supabase
      .from('contract_approval_requests')
      .update({
        status: 'approved',
        response,
        responded_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async reject(approvalId, response) {
    if (isDemoMode()) {
      return demoApprovalsApi.reject(approvalId, response);
    }
    const { data, error } = await supabase
      .from('contract_approval_requests')
      .update({
        status: 'rejected',
        response,
        responded_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

export default {
  contracts: contractsApi,
  phases: phasesApi,
  comments: commentsApi,
  storage: storageApi,
  approvals: approvalsApi
};
