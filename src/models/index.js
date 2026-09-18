const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const User = require('./user.model')(sequelize);
const TrustedContact = require('./trusted-contact.model')(sequelize);
const VaultItem = require('./vault-item.model')(sequelize);
const AccessRequest = require('./access-request.model')(sequelize);
const Vote = require('./vote.model')(sequelize);
const ActivityLog = require('./activity-log.model')(sequelize);
const RefreshToken = require('./refresh-token.model')(sequelize);

User.hasMany(VaultItem, { foreignKey: 'owner_id', onDelete: 'CASCADE' });
VaultItem.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

User.hasMany(TrustedContact, { foreignKey: 'owner_id', as: 'contacts', onDelete: 'CASCADE' });
TrustedContact.belongsTo(User, { foreignKey: 'owner_id', as: 'vault_owner' });

User.hasMany(TrustedContact, { foreignKey: 'contact_id', as: 'assigned_trusts', onDelete: 'CASCADE' });
TrustedContact.belongsTo(User, { foreignKey: 'contact_id', as: 'delegate' });

TrustedContact.hasMany(AccessRequest, { foreignKey: 'trusted_contact_id', onDelete: 'CASCADE' });
AccessRequest.belongsTo(TrustedContact, { foreignKey: 'trusted_contact_id' });

AccessRequest.hasMany(Vote, { foreignKey: 'request_id', as: 'votes', onDelete: 'CASCADE' });
Vote.belongsTo(AccessRequest, { foreignKey: 'request_id', as: 'access_request' });

TrustedContact.hasMany(Vote, { foreignKey: 'trusted_contact_id', onDelete: 'CASCADE' });
Vote.belongsTo(TrustedContact, { foreignKey: 'trusted_contact_id', as: 'voter_contact' });

User.hasMany(ActivityLog, { foreignKey: 'vault_owner_id', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'vault_owner_id', as: 'vault_owner' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  TrustedContact,
  VaultItem,
  AccessRequest,
  Vote,
  ActivityLog,
  RefreshToken,
};