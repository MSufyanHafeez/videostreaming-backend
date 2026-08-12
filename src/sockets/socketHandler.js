const activeUsers = new Map();

const initializeSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id}`);

    // User authenticates socket connection with user ID
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId);
        activeUsers.set(userId, socket.id);
        io.emit('active_users_count', activeUsers.size);
        console.log(`[Socket]: User ${userId} joined room ${userId}`);
      }
    });

    // Real-time post like event push
    socket.on('like_post', (data) => {
      // data: { postId, authorId, senderUsername, senderAvatar }
      if (data.authorId && data.authorId !== data.senderId) {
        io.to(data.authorId).emit('notification', {
          type: 'like',
          message: `${data.senderUsername || 'Someone'} liked your post!`,
          postId: data.postId,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Real-time comment event push
    socket.on('new_comment', (data) => {
      // data: { postId, authorId, text, senderUsername }
      if (data.authorId && data.authorId !== data.senderId) {
        io.to(data.authorId).emit('notification', {
          type: 'comment',
          message: `${data.senderUsername || 'Someone'} commented: "${data.text.substring(0, 30)}..."`,
          postId: data.postId,
          createdAt: new Date().toISOString(),
        });
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          break;
        }
      }
      io.emit('active_users_count', activeUsers.size);
      console.log(`[Socket Disconnected]: ${socket.id}`);
    });
  });
};

module.exports = initializeSockets;
