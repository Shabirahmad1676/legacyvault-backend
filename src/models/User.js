const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      len: [3, 30],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quorum_threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    validate: {
      min: 1,
    }
  },
}, {
  tableName: 'users',
  timestamps: true, // Automatically adds created_at and updated_at
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = User;