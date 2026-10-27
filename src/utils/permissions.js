export const canEditContracts = (user) => !user?.recoveryPending && ['admin', 'editor'].includes(user?.role);

export const canDecideApproval = (user, request) => !user?.recoveryPending && (user?.role === 'admin' ||
  (user?.role === 'approver' && (!request?.approver_id || request.approver_id === user.id)));
