const { AccessRequest, TrustedContact, ActivityLog, User, Vote } = require('../models');
const { ForbiddenError, ConflictError } = require('../errors/AppError');

class AccessRequestService {
  static async expireStaleRequestsForOwner(owner_id) {
    const pendingRequests = await AccessRequest.findAll({
      include: [{ model: TrustedContact, where: { owner_id } }],
      where: { status: 'pending' },
    });

    const now = new Date();

    for (const request of pendingRequests) {
      if (new Date(request.expires_at) < now) {
        await request.update({ status: 'expired' });
        await ActivityLog.create({
          vault_owner_id: owner_id,
          event_description: `Access request expired for request ${request.request_id}.`,
        });
      }
    }
  }

  static async createRequest(requester_id, target_owner_id, reason) {
    const trustLink = await TrustedContact.findOne({
      where: { owner_id: target_owner_id, contact_id: requester_id },
    });

    if (!trustLink) {
      throw new ForbiddenError('You are not a trusted contact for this vault.');
    }

    const existingRequest = await AccessRequest.findOne({
      where: { trusted_contact_id: trustLink.trust_link_id, status: 'pending' },
    });

    if (existingRequest) {
      throw new ConflictError('You already have a pending request for this vault.');
    }

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    const request = await AccessRequest.create({
      trusted_contact_id: trustLink.trust_link_id,
      reason,
      expires_at,
    });

    const requester = await User.findByPk(requester_id);
    await ActivityLog.create({
      vault_owner_id: target_owner_id,
      event_description: `${requester.email} requested emergency access. Reason: ${reason}`,
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
            attributes: ['user_id', 'username', 'email'],
          },
        ],
      },
      {
        model: Vote,
        as: 'votes',
        include: [
          {
            model: TrustedContact,
            as: 'voter_contact',
            include: [
              {
                model: User,
                as: 'delegate',
                attributes: ['user_id', 'username', 'email'],
              },
            ],
          },
        ],
      },
    ],
    order: [['created_at', 'DESC']],
  });
}

  static async getRequestsForVoting(user_id) {
    const userTrusts = await TrustedContact.findAll({
      where: {
        contact_id: user_id,
      },
      attributes: ['owner_id'],
    });

    const ownerIds = userTrusts.map((link) => link.owner_id);

    if (!ownerIds.length) {
      return [];
    }

    const requests = await AccessRequest.findAll({
      where: {
        status: 'pending',
      },
      include: [
        {
          model: TrustedContact,
          where: {
            owner_id: ownerIds,
          },
          include: [
            {
              model: User,
              as: 'vault_owner',
              attributes: [
                'user_id',
                'username',
                'email',
                'quorum_threshold',
              ],
            },
            {
              model: User,
              as: 'delegate',
              attributes: [
                'user_id',
                'username',
                'email',
              ],
            },
          ],
        },
        {
          model: Vote,
          as: 'votes',
          include: [
            {
              model: TrustedContact,
              as: 'voter_contact',
              include: [
                {
                  model: User,
                  as: 'delegate',
                  attributes: [
                    'user_id',
                    'username',
                    'email',
                  ],
                },
              ],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const validRequests = [];
    const now = new Date();

    for (const request of requests) {
      if (new Date(request.expires_at) < now) {
        await request.update({
          status: 'expired',
        });
        continue;
      }

      if (
        request.TrustedContact &&
        request.TrustedContact.contact_id === user_id
      ) {
        continue;
      }

      validRequests.push(request);
    }

    return validRequests;
  }

  static async getMyOutgoingRequests(user_id) {
    const requests = await AccessRequest.findAll({
      include: [
        {
          model: TrustedContact,
          where: {
            contact_id: user_id,
          },
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
        {
          model: Vote,
          as: 'votes',
          include: [
            {
              model: TrustedContact,
              as: 'voter_contact',
              include: [
                {
                  model: User,
                  as: 'delegate',
                  attributes: ['user_id', 'username', 'email'],
                },
              ],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const now = new Date();
    for (const req of requests) {
      if (req.status === 'pending' && new Date(req.expires_at) < now) {
        await req.update({ status: 'expired' });
      }
    }

    return requests;
  }
}

module.exports = AccessRequestService;