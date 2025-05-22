const { DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;

const QQMusicCredential = sequelize.define('qq_music_credentials', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    qqUin: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    pSkey: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    skey: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    cookies: {
        type: DataTypes.JSON,
        allowNull: true
    },
    refreshToken: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    refreshKey: {
        type: DataTypes.STRING(255),
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
    ],
    tableName: 'qq_music_credentials'
});

module.exports = QQMusicCredential; 