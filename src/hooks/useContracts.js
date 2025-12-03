import { useState, useEffect, useCallback, useMemo } from 'react';
import { contractsApi } from '../api/contracts';

/**
 * Custom hook for managing contracts data
 * Provides loading state, error handling, and CRUD operations
 * 
 * @param {object} options - Hook options
 * @param {boolean} options.autoFetch - Whether to fetch on mount (default: true)
 * @param {string} options.orderBy - Column to order by
 * @param {boolean} options.ascending - Sort ascending
 * @param {string} options.status - Filter by status
 * @returns {object} Contracts state and methods
 * 
 * @example
 * const { contracts, loading, error, refetch } = useContracts();
 * 
 * @example
 * const { contracts, loading } = useContracts({ status: 'pending' });
 */
export const useContracts = (options = {}) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const {
    autoFetch = true,
    orderBy = 'updated_at',
    ascending = false,
    status = null,
    limit = null
  } = options;

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await contractsApi.getAll({
        orderBy,
        ascending,
        status,
        limit
      });
      
      setContracts(data);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [orderBy, ascending, status, limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchContracts();
    }
  }, [autoFetch, fetchContracts]);

  // Derived data
  const statusCounts = useMemo(() => {
    const counts = {
      total: contracts.length,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      expiring: 0,
      expired: 0
    };
    
    contracts.forEach(contract => {
      if (counts.hasOwnProperty(contract.status)) {
        counts[contract.status]++;
      }
    });
    
    return counts;
  }, [contracts]);

  // CRUD operations
  const createContract = useCallback(async (contractData) => {
    try {
      const newContract = await contractsApi.create(contractData);
      setContracts(prev => [newContract, ...prev]);
      return newContract;
    } catch (err) {
      console.error('Error creating contract:', err);
      throw err;
    }
  }, []);

  const updateContract = useCallback(async (id, updates) => {
    try {
      const updatedContract = await contractsApi.update(id, updates);
      setContracts(prev => 
        prev.map(c => c.id === id ? updatedContract : c)
      );
      return updatedContract;
    } catch (err) {
      console.error('Error updating contract:', err);
      throw err;
    }
  }, []);

  const deleteContract = useCallback(async (id) => {
    try {
      await contractsApi.delete(id);
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting contract:', err);
      throw err;
    }
  }, []);

  const updateStatus = useCallback(async (id, newStatus) => {
    return updateContract(id, { status: newStatus });
  }, [updateContract]);

  return {
    // State
    contracts,
    loading,
    error,
    statusCounts,
    
    // Actions
    refetch: fetchContracts,
    createContract,
    updateContract,
    deleteContract,
    updateStatus,
    setContracts
  };
};

/**
 * Hook for a single contract
 * @param {number|string} contractId - Contract ID
 * @returns {object} Contract state and methods
 */
export const useContract = (contractId) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContract = useCallback(async () => {
    if (!contractId) {
      setContract(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await contractsApi.getById(contractId);
      setContract(data);
    } catch (err) {
      console.error('Error fetching contract:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const updateContract = useCallback(async (updates) => {
    if (!contractId) return;
    
    try {
      const updated = await contractsApi.update(contractId, updates);
      setContract(updated);
      return updated;
    } catch (err) {
      console.error('Error updating contract:', err);
      throw err;
    }
  }, [contractId]);

  return {
    contract,
    loading,
    error,
    refetch: fetchContract,
    updateContract
  };
};

/**
 * Hook for contract search
 * @param {string} searchTerm - Search term
 * @param {object} options - Search options
 * @returns {object} Search results and state
 */
export const useContractSearch = (searchTerm, options = {}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async () => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await contractsApi.search(searchTerm, options);
      setResults(data);
    } catch (err) {
      console.error('Error searching contracts:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    const timer = setTimeout(search, 300); // Debounce
    return () => clearTimeout(timer);
  }, [search]);

  return {
    results,
    loading,
    error,
    search
  };
};

/**
 * Hook for expiring contracts
 * @param {number} days - Number of days threshold
 * @returns {object} Expiring contracts state
 */
export const useExpiringContracts = (days = 14) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpiring = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await contractsApi.getExpiring(days);
      setContracts(data);
    } catch (err) {
      console.error('Error fetching expiring contracts:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchExpiring();
  }, [fetchExpiring]);

  return {
    contracts,
    loading,
    error,
    refetch: fetchExpiring
  };
};

export default useContracts;
