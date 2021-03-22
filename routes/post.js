const express = require('express');
const multer = require('multer');
const path = require('path'); // node에서 제공하는 기본 모듈

const db = require('../models');
const { isLoggedIn } = require('./middlewares');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, done) { // 어디다 저장할지
      done(null, 'uploads');
    },
    filename(req, file, done) {
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext); // 제로초.png, basename = 제로초, ext = .png
      done(null, basename + Date.now() + ext);
    },
  }),
  limit: { fileSize: 20 * 1024 * 1024 },
});
router.post('/images', isLoggedIn, upload.array('image'), (req, res) => {
  console.log(req.files);
  res.json(req.files.map(v => v.filename));
});

router.post('/', isLoggedIn, async (req, res, next) => { // POST /post
  try {
    const hashtags = req.body.content.match(/#[^\s#]+/g);
    const newPost = await db.Post.create({
      content: req.body.content,
      UserId: req.user.id,
    });
    if (hashtags) {
      const result = await Promise.all(hashtags.map(tag => db.Hashtag.findOrCreate({
        where: { name: tag.slice(1).toLowerCase() },
      })));
      await newPost.addHashtags(result.map(r => r[0]));
    }
    const fullPost = await db.Post.findOne({
      where: { id: newPost.id },
      include: [{ // 게시글은 사용자에게 속해 있는 관계가 있으므로 그 정보를 자동으로 포함해주는 기능 include
        model: db.User,
        attributes: ['id', 'nickname'], // id, 닉네임만 가지고 오도록 제한할 수 있다.
      }],
    });
    return res.json(fullPost);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// 댓글 가져오기
router.get('/:id/comments', async (req, res, next) => {
  try {
    const post = await db.Post.findOne({ where: { id: req.params.id } });
    if(!post) {
      return res.status(404).send('게시물이 존재하지않습니다.');
    }
    const comments = await db.Comment.findAll({
      where: {
        PostId: req.params.id,
      },
      include: [{
        model: db.User,
        attributes:['id','nickname'],
      }],
      order: [['createdAt', 'ASC']], // 다른 정렬조건도 있을수있으니깐
    });
    res.json(comments)
  } catch(err) {
    console.log(err);
    next(err);
  }
});

// 댓글 작성
router.post('/:id/comment', isLoggedIn, (req,res,next) => { // :id => 게시글의 아이디
  try {
    const post = await db.Post.findOne({ where: { id: req.params.id} });
    if(!post) {
      return res.status(404).send('게시물이 존재하지않습니다.');
    }
    const newComment = await db.Comment.create({
      PostId: post.id, // post.addComment(newComment.id) 작업을 이걸로 한번에
      UserId: req.user.id,
      content: req.body.content,
    });
    //await post.addComment(newComment.id);
    const comment = await db.Comment.findOne({
      where: {
        id: newComment.id,
      },
      include: [{
        model: db.User,
        attributes:['id','nickname'],
      }]
    });
    return res.json(comment);
  } catch(err) {
    next(err);
  }
});

module.exports = router;
