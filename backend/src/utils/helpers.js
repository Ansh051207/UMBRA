exports.generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

exports.formatDate = (date) => {
  return new Date(date).toISOString();
};



exports.logRequest = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    originalSend.call(this, data);
  };

  next();
};