module.exports = (sequelize, DataTypes) => {
  /**
   * @param_1 Table 내용
   * @param_2 환경설정
   */
  const User = sequelize.define('User', { 
    email: {
      type: DataTypes.STRING(40), // 40자 이내
      allowNull: false, // 필수
      unique: true, // 중복금지
    },
    nickname: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
    }, //아외에 createdAt, updatedAt, 고유id 같은 컬럼들이 추가된다.
  }, {
    charset: 'utf8',
    collate: 'utf8_general_ci', // 한글 저장돼요
  });

  User.associate = (db) => {
    db.User.hasMany(db.Post);
    db.User.hasMany(db.Comment);
  };

  return User;
};
