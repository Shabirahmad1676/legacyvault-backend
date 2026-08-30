const AccessRequestService = require('../services/accessRequest.service');
const asyncHandler = require('../middleware/asyncHandler');

class AccessRequestController {
  static createAccessRequest = asyncHandler(async (req, res) => {
    const requester_id = req.user.user_id;
    const { target_owner_id, reason } = req.body;

    const request = await AccessRequestService.createRequest(requester_id, target_owner_id, reason);

    const HTTP_STATUSES = require('../enums/httpStatuses');
    res.status(HTTP_STATUSES.CREATED).json({ status: 'success', data: request });
  });

  static getIncomingAccessRequests = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;

    const requests = await AccessRequestService.getIncomingRequests(owner_id);

    const HTTP_STATUSES = require('../enums/httpStatuses');
    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: requests });
  });

  static getRequestsToVote = asyncHandler(async (req, res) => {
    const requests = await AccessRequestService.getRequestsForVoting(req.user.user_id);
    const HTTP_STATUSES = require('../enums/httpStatuses');
    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: requests });
  });
}

module.exports = AccessRequestController;
