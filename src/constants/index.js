const ACCESS_TIERS = Object.freeze({
  ALWAYS_VISIBLE: 'always_visible',
  QUORUM_REQUIRED: 'quorum_required',
});

const ITEM_CATEGORIES = Object.freeze({
  PASSWORD: 'password',
  DOCUMENT: 'document',
  INSTRUCTION: 'instruction',
  ASSET: 'asset',
});

const REQUEST_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
  EXPIRED: 'expired',
});

const VOTE_DECISIONS = Object.freeze({
  APPROVE: 'approve',
  DENY: 'deny',
});

module.exports = {
  ACCESS_TIERS,
  ITEM_CATEGORIES,
  REQUEST_STATUSES,
  VOTE_DECISIONS,
};