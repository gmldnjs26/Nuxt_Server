const passport = require('passport');
const local = require('./local');
const db = require('../models');

module.exports = () => { // 함수로 모듈을 만들어야 재사용이 용이하니깐
  passport.serializeUser((user, done) => {
    return done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db.User.findOne({ 
        where: { id },
        attributes: ['id', 'nickname'],
        include: [{
          model: db.Post,
          attributes: ['id'],
        },{
          model: db.User,
          as: 'Followings',
          attributes: ['id'],
        },{
          model: db.User,
          as: 'Followers',
          attributes: ['id'],
        }]
      });
      return done(null, user); // req.user, req.isAuthenticated() === true,
    } catch (err) {
      console.error(err);
      return done(err);
    }
  });
  local(); // localStrategy가 등록된다.
};
