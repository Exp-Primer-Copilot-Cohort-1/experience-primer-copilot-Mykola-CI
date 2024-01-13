// Create web server
// ----------------
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { randomBytes } = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// In-memory data
const commentsByPostId = {};

// Routes
app.get('/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const comments = commentsByPostId[id] || [];

  res.status(200).json(comments);
});

app.post('/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const commentId = randomBytes(4).toString('hex');
  const comments = commentsByPostId[id] || [];
  comments.push({ id: commentId, content, status: 'pending' });
  commentsByPostId[id] = comments;

  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: id, status: 'pending' },
  });

  res.status(201).json(comments);
});

app.post('/events', async (req, res) => {
  const { type, data } = req.body;

  console.log(`Event received: ${type}`);

  if (type === 'CommentModerated') {
    const { postId, id, status, content } = data;

    const comments = commentsByPostId[postId];
    const comment = comments.find((comment) => comment.id === id);
    comment.status = status;

    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }

  res.status(200).json({});
});

app.listen(4001, () => {
  console.log('Listening on port 4001');
});