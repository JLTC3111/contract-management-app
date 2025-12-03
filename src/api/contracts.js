/**
 * Contracts API Service
 * Centralized contract CRUD operations with Supabase
 */

import { supabase } from '../utils/supaBaseClient';

/**
 * Contracts API
 * All contract-related database operations
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
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        ...contract,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();
    
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
    const { data, error } = await supabase
      .from('comments')
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
    const { data, error } = await supabase
      .from('comments')
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
    const { error } = await supabase
      .from('comments')
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
    const { data, error } = await supabase.storage
      .from('contracts')
      .list(folder, {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) throw error;
    return data || [];
  }
};

export default {
  contracts: contractsApi,
  phases: phasesApi,
  comments: commentsApi,
  storage: storageApi
};
