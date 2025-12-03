/**
 * Centralized constants for the Contract Management App
 * Use these instead of hardcoding values across components
 */

// Status colors used across ContractTable, Dashboard, Analytics, etc.
export const STATUS_COLORS = {
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  draft: '#6b7280',
  expiring: '#f97316',
  expired: '#dc2626',
  completed: '#8b5cf6',
  active: '#3b82f6',
  delayed: '#dc2626',
  cancelled: '#9ca3af'
};

// Status icons for display
export const STATUS_ICONS = {
  approved: '✅',
  pending: '⏳',
  draft: '📝',
  rejected: '❌',
  expired: '🛑',
  expiring: '⚠️',
  completed: '✔️',
  active: '▶️',
  delayed: '🔴',
  cancelled: '🚫'
};

// Expiry thresholds in days (when to show expiring warning)
export const EXPIRY_THRESHOLDS = {
  draft: 21,
  pending: 14,
  approved: 7,
  rejected: 7,
  default: 14
};

// File upload constraints
export const FILE_CONSTRAINTS = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxSizeLabel: '50MB',
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
  ],
  allowedExtensions: [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.csv'
  ]
};

// Contract statuses for dropdowns
export const CONTRACT_STATUSES = [
  { value: 'draft', labelKey: 'contractTable.status.draft' },
  { value: 'pending', labelKey: 'contractTable.status.pending' },
  { value: 'approved', labelKey: 'contractTable.status.approved' },
  { value: 'rejected', labelKey: 'contractTable.status.rejected' },
  { value: 'expiring', labelKey: 'contractTable.status.expiring' },
  { value: 'expired', labelKey: 'contractTable.status.expired' }
];

// Phase statuses
export const PHASE_STATUSES = [
  { value: 'pending', labelKey: 'phaseManagement.status.pending' },
  { value: 'active', labelKey: 'phaseManagement.status.active' },
  { value: 'completed', labelKey: 'phaseManagement.status.completed' },
  { value: 'delayed', labelKey: 'phaseManagement.status.delayed' },
  { value: 'cancelled', labelKey: 'phaseManagement.status.cancelled' }
];

// User roles
export const USER_ROLES = {
  admin: { level: 4, labelKey: 'roles.admin' },
  editor: { level: 3, labelKey: 'roles.editor' },
  approver: { level: 2, labelKey: 'roles.approver' },
  viewer: { level: 1, labelKey: 'roles.viewer' }
};

// Animation durations (for consistency)
export const ANIMATION = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  stagger: 0.1
};

// Pagination defaults
export const PAGINATION = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50, 100]
};

// Debounce delays in ms
export const DEBOUNCE = {
  search: 300,
  resize: 150,
  scroll: 100
};

// Storage bucket names
export const STORAGE_BUCKETS = {
  contracts: 'contracts'
};

// Route paths
export const ROUTES = {
  login: '/login',
  dashboard: '/',
  newContract: '/new',
  contractDetail: '/contract/:id',
  approvals: '/approvals',
  lifecycle: '/lifecycle',
  lifecycleWithId: '/lifecycle/:contractId',
  manual: '/manual'
};

// Helper function to get status color
export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || STATUS_COLORS.draft;
};

// Helper function to get status icon
export const getStatusIcon = (status) => {
  return STATUS_ICONS[status] || STATUS_ICONS.draft;
};

// Helper function to check if status is terminal
export const isTerminalStatus = (status) => {
  return ['approved', 'rejected', 'expired', 'cancelled'].includes(status);
};

// Helper function to get expiry threshold for a status
export const getExpiryThreshold = (status) => {
  return EXPIRY_THRESHOLDS[status] || EXPIRY_THRESHOLDS.default;
};
