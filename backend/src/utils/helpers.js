exports.generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

exports.formatDate = (date) => {
  return new Date(date).toISOString();
};

exports.calculatePasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;
  
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 10;
  if (/\d/.test(password)) strength += 10;
  if (/[^A-Za-z0-9]/.test(password)) strength += 10;
  
  // Check for common patterns (reduce strength)
  const commonPatterns = ['123', 'abc', 'qwerty', 'password', 'admin'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    strength -= 20;
  }
  
  return Math.min(Math.max(strength, 0), 100);
};

exports.logRequest = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    originalSend.call(this, data);
  };
  
  next();
};