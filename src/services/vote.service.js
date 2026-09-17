const { sequelize, Vote, AccessRequest, TrustedContact, User, ActivityLog } = require('../models');
const { NotFoundError, UnprocessableEntityError, BadRequestError, ForbiddenError, ConflictError } = require('../errors/AppError');

class VoteService {
  static async castVote(voter_id, request_id, decision) {
    const t = await sequelize.transaction();

    try {
      const request = await AccessRequest.findByPk(request_id, {
        lock: t.LOCK.UPDATE,
        transaction: t,
        include: [
          {
            model: TrustedContact,
            include: [
              {
                model: User,
                as: 'vault_owner',
                attributes: ['user_id', 'username', 'email', 'quorum_threshold'],
              },
              {
                model: User,
                as: 'delegate',
                attributes: ['user_id', 'username', 'email'],
              },
            ],
          },
        ],
      });

      if (!request) {
        throw new NotFoundError('Access request not found.');
      }

      if (new Date(request.expires_at) < new Date()) {
        await request.update({ status: 'expired' }, { transaction: t });
        await ActivityLog.create({
          vault_owner_id: request.TrustedContact.owner_id,
          event_description: `Access request from ${request.TrustedContact.delegate?.email || 'trusted contact'} expired.`,
        }, { transaction: t });

        throw new UnprocessableEntityError('This access request has expired.');
      }

      if (request.status !== 'pending') {
        throw new BadRequestError(`This request is already ${request.status}.`);
      }

      const vault_owner = request.TrustedContact.vault_owner;
      const vault_owner_id = vault_owner.user_id;

      // Requester cannot vote on their own request
      const requester_id = request.TrustedContact.contact_id;
      if (requester_id === voter_id) {
        throw new ForbiddenError('You cannot vote on your own access request.');
      }

      // Verify voter is a trusted contact of this vault owner
      const voterTrustLink = await TrustedContact.findOne({
        where: {
          owner_id: vault_owner_id,
          contact_id: voter_id,
        },
        include: [
          {
            model: User,
            as: 'delegate',
            attributes: ['user_id', 'username', 'email'],
          },
        ],
        transaction: t,
      });

      if (!voterTrustLink) {
        throw new ForbiddenError('You are not a trusted contact for this vault.');
      }

      // Prevent duplicate vote
      const existingVote = await Vote.findOne({
        where: {
          request_id,
          trusted_contact_id: voterTrustLink.trust_link_id,
        },
        transaction: t,
      });

      if (existingVote) {
        throw new ConflictError('You have already cast a vote for this request.');
      }

      // Create vote
      const vote = await Vote.create({
        request_id,
        trusted_contact_id: voterTrustLink.trust_link_id,
        decision,
      }, { transaction: t });

      // Human-readable Activity Log
      const voterName = voterTrustLink.delegate?.username || voterTrustLink.delegate?.email || 'Trusted contact';
      const requesterName = request.TrustedContact.delegate?.username || request.TrustedContact.delegate?.email || 'Requester';

      await ActivityLog.create({
        vault_owner_id,
        event_description: `${voterName} voted ${decision} on emergency access petition by ${requesterName}.`,
      }, { transaction: t });

      // Calculate Quorum
      const totalContacts = await TrustedContact.count({
        where: { owner_id: vault_owner_id },
        transaction: t,
      });

      // Eligible peers excluding the requester
      const eligibleVoters = Math.max(1, totalContacts - 1);
      const effectiveThreshold = Math.min(vault_owner.quorum_threshold, eligibleVoters);

      const allVotes = await Vote.findAll({
        where: { request_id },
        transaction: t,
      });

      const approveCount = allVotes.filter((v) => v.decision === 'approve').length;
      const denyCount = allVotes.filter((v) => v.decision === 'deny').length;

      // Mathematical short-circuit calculation:
      // Can approvals ever reach effectiveThreshold given remaining possible votes?
      const remainingPossibleVotes = eligibleVoters - allVotes.length;
      const maxPossibleApprovals = approveCount + Math.max(0, remainingPossibleVotes);

      let newStatus = 'pending';
      let accessExpiresAt = null;

      if (approveCount >= effectiveThreshold) {
        newStatus = 'approved';
        accessExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour access window
      } else if (maxPossibleApprovals < effectiveThreshold) {
        // Deny short-circuit: Reaching quorum is mathematically impossible
        newStatus = 'denied';
      }

      if (newStatus !== 'pending') {
        await request.update({
          status: newStatus,
          ...(accessExpiresAt && { access_expires_at: accessExpiresAt }),
        }, { transaction: t });

        await ActivityLog.create({
          vault_owner_id,
          event_description: newStatus === 'approved'
            ? `Emergency access granted to ${requesterName}: Quorum reached with ${approveCount} of ${effectiveThreshold} required approvals.`
            : `Emergency access denied to ${requesterName}: Access petition rejected with ${denyCount} denial votes.`,
        }, { transaction: t });
      }

      await t.commit();

      return {
        vote,
        current_request_status: newStatus,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = VoteService;
