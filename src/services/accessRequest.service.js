const { AccessRequest, TrustedContact, ActivityLog, User, Vote } = require('../models');
const AppError = require('../errors/AppError');

class AccessRequestService {
  static async expireStaleRequestsForOwner(owner_id) {
    const pendingRequests = await AccessRequest.findAll({
      include: [{ model: TrustedContact, where: { owner_id } }],
      where: { status: 'pending' }
    });

    const now = new Date();

    for (const request of pendingRequests) {
      if (new Date(request.expires_at) < now) {
        await request.update({ status: 'expired' });
        await ActivityLog.create({
          vault_owner_id: owner_id,
          event_description: `Access request expired for request ${request.request_id}.`
        });
      }
    }
  }

  static async createRequest(requester_id, target_owner_id, reason) {
    const trustLink = await TrustedContact.findOne({
      where: { owner_id: target_owner_id, contact_id: requester_id }
    });

    if (!trustLink) {
      throw new AppError('You are not a trusted contact for this vault.', 403);
    }

    const existingRequest = await AccessRequest.findOne({
      where: { trusted_contact_id: trustLink.trust_link_id, status: 'pending' }
    });

    if (existingRequest) {
      throw new AppError('You already have a pending request for this vault.', 409);
    }

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    const request = await AccessRequest.create({
      trusted_contact_id: trustLink.trust_link_id,
      reason,
      expires_at
    });

    const requester = await User.findByPk(requester_id);
    await ActivityLog.create({
      vault_owner_id: target_owner_id,
      event_description: `${requester.email} requested emergency access. Reason: ${reason}`
    });

    return request;
  }

  static async getIncomingRequests(owner_id) {
    await this.expireStaleRequestsForOwner(owner_id);

    return await AccessRequest.findAll({
      include: [
        {
          model: TrustedContact,
          where: { owner_id },
          include: [
            {
              model: User,
              as: 'delegate',
              attributes: ['user_id', 'email']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  static async getRequestsForVoting(user_id) {
    const userTrusts = await TrustedContact.findAll({ where: { contact_id: user_id } });
    const trustIds = userTrusts.map((link) => link.trust_link_id);

    if (!trustIds.length) {
      return [];
    }

    const requests = await AccessRequest.findAll({
      where: { trusted_contact_id: trustIds, status: 'pending' },
      include: [
        {
          model: TrustedContact,
          include: [{ model: User, as: 'vault_owner', attributes: ['user_id', 'email'] }]
        },
        {
          model: Vote,
          include: [{
            model: TrustedContact,
            include: [{ model: User, as: 'delegate', attributes: ['user_id', 'email'] }]
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    for (const request of requests) {
      if (new Date(request.expires_at) < new Date()) {
        await request.update({ status: 'expired' });
      }
    }

    return AccessRequest.findAll({
      where: { trusted_contact_id: trustIds, status: 'pending' },
      include: [
        {
          model: TrustedContact,
          include: [{ model: User, as: 'vault_owner', attributes: ['user_id', 'email'] }]
        },
        {
          model: Vote,
          include: [{
            model: TrustedContact,
            include: [{ model: User, as: 'delegate', attributes: ['user_id', 'email'] }]
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = AccessRequestService;
