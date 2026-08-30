const sequelize = require('../config/database');
const User = require('./User');
const TrustedContact = require('./TrustedContact');
const VaultItem = require('./VaultItem');
const AccessRequest = require('./AccessRequest');
const Vote = require('./Vote');
const Category = require('./Category');
const ActivityLog = require('./ActivityLog');

// 1. User <-> VaultItems
User.hasMany(VaultItem, { foreignKey: 'owner_id', onDelete: 'CASCADE' });
VaultItem.belongsTo(User, { foreignKey: 'owner_id' });

// 2. User <-> TrustedContacts
User.hasMany(TrustedContact, { foreignKey: 'owner_id', as: 'contacts', onDelete: 'CASCADE' });
TrustedContact.belongsTo(User, { foreignKey: 'owner_id', as: 'vault_owner' });

User.hasMany(TrustedContact, { foreignKey: 'contact_id', as: 'assigned_trusts', onDelete: 'CASCADE' });
TrustedContact.belongsTo(User, { foreignKey: 'contact_id', as: 'delegate' });

// 3. TrustedContact <-> AccessRequests (The Magic Link)
TrustedContact.hasMany(AccessRequest, { foreignKey: 'trusted_contact_id', onDelete: 'CASCADE' });
AccessRequest.belongsTo(TrustedContact, { foreignKey: 'trusted_contact_id' });

// 4. AccessRequest <-> Votes
AccessRequest.hasMany(Vote, { foreignKey: 'request_id', onDelete: 'CASCADE' });
Vote.belongsTo(AccessRequest, { foreignKey: 'request_id' });

// 5. TrustedContact <-> Votes
TrustedContact.hasMany(Vote, { foreignKey: 'trusted_contact_id', onDelete: 'CASCADE' });
Vote.belongsTo(TrustedContact, { foreignKey: 'trusted_contact_id' });

// 6. User <-> ActivityLogs
User.hasMany(ActivityLog, { foreignKey: 'vault_owner_id', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'vault_owner_id' });

User.hasMany(Category, { foreignKey: 'owner_id', onDelete: 'CASCADE' });
Category.belongsTo(User, { foreignKey: 'owner_id' });

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection authenticated successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  User,
  TrustedContact,
  VaultItem,
  AccessRequest,
  Vote,
  Category,
  ActivityLog,
};
