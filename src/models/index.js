const sequelize = require('../config/database');
const User = require('./user.model');
const TrustedContact = require('./trusted-contact.model');
const VaultItem = require('./vault-item.model');
const AccessRequest = require('./access-request.model');
const Vote = require('./vote.model');
const ActivityLog = require('./activity-log.model');

// 1. User <-> VaultItems (1:M)
User.hasMany(VaultItem, { foreignKey: 'owner_id', onDelete: 'CASCADE' });
VaultItem.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// 2. User <-> TrustedContacts (1:M as Vault Owner, 1:M as Assigned Delegate)
User.hasMany(TrustedContact, { foreignKey: 'owner_id', as: 'contacts', onDelete: 'CASCADE' });
TrustedContact.belongsTo(User, { foreignKey: 'owner_id', as: 'vault_owner' });

User.hasMany(TrustedContact, { foreignKey: 'contact_id', as: 'assigned_trusts', onDelete: 'CASCADE' });
TrustedContact.belongsTo(User, { foreignKey: 'contact_id', as: 'delegate' });

// 3. TrustedContact <-> AccessRequests (1:M)
TrustedContact.hasMany(AccessRequest, { foreignKey: 'trusted_contact_id', onDelete: 'CASCADE' });
AccessRequest.belongsTo(TrustedContact, { foreignKey: 'trusted_contact_id' });

// 4. AccessRequest <-> Votes (1:M)
AccessRequest.hasMany(Vote, { foreignKey: 'request_id', as: 'votes', onDelete: 'CASCADE' });
Vote.belongsTo(AccessRequest, { foreignKey: 'request_id', as: 'access_request' });

// 5. TrustedContact <-> Votes (1:M)
TrustedContact.hasMany(Vote, { foreignKey: 'trusted_contact_id', onDelete: 'CASCADE' });
Vote.belongsTo(TrustedContact, { foreignKey: 'trusted_contact_id', as: 'voter_contact' });

// 6. User <-> ActivityLogs (1:M)
User.hasMany(ActivityLog, { foreignKey: 'vault_owner_id', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'vault_owner_id', as: 'vault_owner' });

module.exports = {
  sequelize,
  User,
  TrustedContact,
  VaultItem,
  AccessRequest,
  Vote,
  ActivityLog,
};