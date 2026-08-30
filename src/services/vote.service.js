const { Vote, AccessRequest, TrustedContact, User, ActivityLog } = require('../models');
const { AppError, NotFoundError, UnprocessableEntityError, BadRequestError, ForbiddenError, ConflictError } = require('../errors/AppError');

class VoteService {
  static async castVote(voter_id, request_id, decision) {
    const request = await AccessRequest.findByPk(request_id, {
      include: [{
        model: TrustedContact,
        include: [{ model: User, as: 'vault_owner' }]
      }]
    });

    if (!request) throw new NotFoundError('Access request not found.');

    if (new Date(request.expires_at) < new Date()) {
      await request.update({ status: 'expired' });
      throw new UnprocessableEntityError('This access request has expired.');
    }

    if (request.status !== 'pending') throw new BadRequestError(`This request is already ${request.status}.`);

    const vault_owner = request.TrustedContact.vault_owner;
    const vault_owner_id = vault_owner.user_id;

    const voterTrustLink = await TrustedContact.findOne({
      where: { owner_id: vault_owner_id, contact_id: voter_id }
    });

    if (!voterTrustLink) throw new ForbiddenError('You are not a trusted contact for this vault.');

    const existingVote = await Vote.findOne({
      where: { request_id, trusted_contact_id: voterTrustLink.trust_link_id }
    });

    if (existingVote) throw new ConflictError('You have already cast a vote for this request.');

    const vote = await Vote.create({
      request_id,
      trusted_contact_id: voterTrustLink.trust_link_id,
      decision
    });

    const voterUser = await User.findByPk(voter_id);
    await ActivityLog.create({
      vault_owner_id,
      event_description: `${voterUser.email} voted to ${decision} the access request.`
    });

    const allVotes = await Vote.findAll({ where: { request_id } });
    const approveCount = allVotes.filter(v => v.decision === 'approve').length;
    const denyCount = allVotes.filter(v => v.decision === 'deny').length;

    const threshold = vault_owner.quorum_threshold;
    const totalContacts = await TrustedContact.count({ where: { owner_id: vault_owner_id } });

    let newStatus = 'pending';

    if (approveCount >= threshold) {
      newStatus = 'approved';
    } else if (denyCount > (totalContacts - threshold)) {
      newStatus = 'rejected';
    }

    if (newStatus !== 'pending') {
      await request.update({ status: newStatus });
      await ActivityLog.create({
        vault_owner_id,
        event_description: `Quorum reached! Access request status updated to: ${newStatus}.`
      });
    }

    return { vote, current_request_status: newStatus };
  }
}

module.exports = VoteService;
