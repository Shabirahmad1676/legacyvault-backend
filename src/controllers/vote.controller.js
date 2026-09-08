const VoteService = require('../services/vote.service');
const asyncHandler = require('../middleware/async-handler.middleware');
const HTTP_STATUSES = require('../enums/httpStatuses');

class VoteController {
  static castVote = asyncHandler(async (req, res) => {
    const voter_id = req.user.user_id;
    const { request_id } = req.params;
    const { decision } = req.body;

    const result = await VoteService.castVote(voter_id, request_id, decision);

    
    res.status(HTTP_STATUSES.CREATED).json({ status: 'success', data: result });
  });

  static cast = this.castVote;
}

module.exports = VoteController;
