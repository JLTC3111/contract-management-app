/**
 * Sidebar Component - Re-export from layout folder
 * 
 * The Sidebar has been refactored and split into smaller components:
 * - Sidebar.jsx (main) - src/components/layout/Sidebar.jsx
 * - SidebarNav.jsx (SidebarButton, SubMenu) - src/components/layout/SidebarNav.jsx
 * - PasswordChangeModal.jsx - src/components/layout/PasswordChangeModal.jsx
 * - UserProfileSection.jsx - src/components/layout/UserProfileSection.jsx
 * 
 * This file re-exports for backwards compatibility.
 * New code should import from './layout/Sidebar' or './layout'
 */

export { default } from './layout/Sidebar';
export { SidebarButton, SubMenu } from './layout/SidebarNav';
export { default as PasswordChangeModal } from './layout/PasswordChangeModal';
export { default as UserProfileSection } from './layout/UserProfileSection';
