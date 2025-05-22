const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QQMusicCredential = sequelize.define('QQMusicCredential', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    qqUin: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pSkey: {
        type: DataTypes.STRING,
        allowNull: true
    },
    skey: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cookies: {
        type: DataTypes.JSON,
        allowNull: true
    },
    refreshToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    refreshKey: {
        type: DataTypes.STRING,
        allowNull: true
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId']
        }
    ]
});

module.exports = QQMusicCredential; 