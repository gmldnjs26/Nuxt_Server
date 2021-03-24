const express = require('express');

const db = require('../models');

const router = express.Router();

// 게시물 가져오기 
router.get('/', async (req, res, next) => { // GET /posts?offset=10&limit=10 쿼리스트링
  try {
    let where = {};
    if (parseInt(req.query.lastId, 10)) {
      where = {
        id: { // lt(미만) lte(이하) gt(초과) gte(이상) ne(불일치) in nin
          [db.Sequelize.Op.lt]: parseInt(req.query.lastId, 10), // less than
        },
      };
    }
    const posts = await db.Post.findAll({
      where,
      include: [{
        model: db.User,
        attributes: ['id', 'nickname'],
      }, {
        model: db.Image,
      }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(req.query.limit, 10) || 10,
    });
    res.json(posts);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;