const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const cookie = require('cookie-parser');
const morgan = require('morgan');

const db = require('./models');
const passportConfig = require('./passport');
const userRouter = require('./routes/user');
const postRouter = require('./routes/post');
const postsRouter = require('./routes/posts');
const app = express();

db.sequelize.sync();
passportConfig();

// app.use req, res를 조작한다 (미들웨어)
app.use(morgan('dev')); // 요청이 왔을때 기록을 해주는 모듈
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use('/', express.static('uploads')); //(주소를 uploads -> / 바꿈 앞단뒷단 주소를 다르게 해야 보안 강화) 프론트에서 정적자원에 접근할 수 있다.
app.use(express.json()); // json을 받을 수 있게
app.use(express.urlencoded({ extended: false })); // form을 통해서 전송할 때 해석해서 req에 넣어준다.
app.use(cookie('cookiesecret'));
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'cookiesecret',
  cookie: {
    httpOnly: true,
    secure: false,
  },
}));
app.use(passport.initialize()); // 여기서 req.login를 넣어준다.
app.use(passport.session());

app.get('/', (req, res) => {
  res.status(200).send('안녕 제로초');
});

app.use('/user', userRouter);
app.use('/post', postRouter);
app.use('/posts',postsRouter);

// router 실행전에는 deserialized 가 실행됨
app.post('/post', (req, res) => {
  if (req.isAuthenticated()) {

  }
});

app.listen(3087, () => {
  console.log(`백엔드 서버 ${3087}번 포트에서 작동중.`);
});
