const FIXED_USER_ID = '00000000-0000-0000-0000-000000000001';

function auth(req, res, next) {
  req.userId = FIXED_USER_ID;
  next();
}

module.exports = auth;
