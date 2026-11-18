const transitions = {
  pending: ['scheduled'],
  scheduled: ['out-for-delivery'],
  'out-for-delivery': ['delivered'],
  delivered: [],
  completed: [],
  cancelled: [],
};

function canTransitionDelivery(currentStatus, nextStatus, hasSelectedSlot) {
  if (currentStatus === nextStatus) return true;
  if (currentStatus === 'pending' && nextStatus === 'scheduled') {
    return hasSelectedSlot;
  }
  return (transitions[currentStatus] || []).includes(nextStatus);
}

module.exports = { canTransitionDelivery };