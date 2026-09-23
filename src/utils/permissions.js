export const canEditContracts = (user) => ['admin', 'editor'].includes(user?.role);

export const canDecideApproval = (user, request) => user?.role === 'admin' ||
  (user?.role === 'approver' && (!request?.approver_id || request.approver_id === user.id));
