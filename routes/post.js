const express = require('express');
const multer = require('multer');
const path = require('path'); // node에서 제공하는 기본 모듈
const { User } = require('../models');

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
    const newPost = await db.Post.create(
    {
      content: req.body.content,
      UserId: req.user.id,
    });
    if (hashtags) {
      const result = await Promise.all(hashtags.map(tag => db.Hashtag.findOrCreate({
        where: { name: tag.slice(1).toLowerCase() },
      })));
      await newPost.addHashtags(result.map(r => r[0]));
    }
    if (req.body.image) {
      if (Array.isArray(req.body.image)) { // 배열이냐?
        const images = await Promise.all(req.body.image.map((image) => {
          return db.Image.create({ src: image, PostId: newPost.id});
        }))
      } else {
        const image = await db.Image.create({ src: req.body.image, PostId: newPost.id});
      }
    }
    const fullPost = await db.Post.findOne({
      where: { id: newPost.id },
      include: [{ // 게시글은 사용자에게 속해 있는 관계가 있으므로 그 정보를 자동으로 포함해주는 기능 include
        model: db.User,
        attributes: ['id', 'nickname'], // id, 닉네임만 가지고 오도록 제한할 수 있다.
      }, {
        model: db.Image,
      }],
    });
    return res.json(fullPost);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db.Post.destory({
      where: {
        id: req.params.id,
      }
    });
  } catch(err) {
    console.error(err);
    next(err);
  }
})

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
router.post('/:id/comment', isLoggedIn, async (req,res,next) => { // :id => 게시글의 아이디
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

router.post('/:id/retweet', isLoggedIn, async (req, res, next) => {
  try {
    const post = await db.Post.findOne({
      where: { id: req.params.id },
      include: [{
        model: db.Post,
        as: 'Retweet', // 리트윗한 게시글이면 원본 게시글이 됨
      }],
    });
    if (!post) {
      return res.status(404).send('포스트가 존재하지 않습니다.');
    }
    if (req.user.id === post.UserId || (post.Retweet && post.Retweet.UserId === req.user.id)) {
      return res.status(403).send('자신의 글은 리트윗할 수 없습니다.');
    }
    const retweetTargetId = post.RetweetId || post.id;
    const exPost = await db.Post.findOne({
      where: {
        UserId: req.user.id,
        RetweetId: retweetTargetId,
      },
    });
    if (exPost) {
      return res.status(403).send('이미 리트윗했습니다.');
    }
    const retweet = await db.Post.create({
      UserId: req.user.id,
      RetweetId: retweetTargetId, // 원본 아이디
      content: 'retweet',
    });
    const retweetWithPrevPost = await db.Post.findOne({
      where: { id: retweet.id },
      include: [{
        model: db.User,
        attributes: ['id', 'nickname'],
      }, {
        model: db.User,
        as: 'Likers',
        attributes: ['id'],
      }, {
        model: db.Post,
        as: 'Retweet',
        include: [{
          model: db.User,
          attributes: ['id', 'nickname'],
        }, {
          model: db.Image,
        }],
      }],
    });
    res.json(retweetWithPrevPost);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post('/:id/like', isLoggedIn, async (req, res, next) => {
  try {
    const post = await db.Post.findOne({ where: { id: req.params.id }});
    if (!post) {
      return res.status(404).send('포스트가 존재하지 않습니다.');
    }
    await post.addLiker(req.user.id);
    res.json({ userId: req.user.id });
  } catch (e) {
    console.error(e);
    next(e);
  }
});

router.delete('/:id/like', isLoggedIn, async (req, res, next) => {
  try {
    const post = await db.Post.findOne({ where: { id: req.params.id }});
    if (!post) {
      return res.status(404).send('포스트가 존재하지 않습니다.');
    }
    await post.removeLiker(req.user.id);
    res.json({ userId: req.user.id });
  } catch (e) {
    console.error(e);
    next(e);
  }
});

module.exports = router;
