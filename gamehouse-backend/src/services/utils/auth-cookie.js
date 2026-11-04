const { verifyToken } = require('./jwt');

const name = 'gamehouse_session';
const options = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api' });
const setSessionCookie = (res, token) => {
  const expiresAt = verifyToken(token).exp * 1000;
  res.cookie(name, token, { ...options(), expires: new Date(expiresAt) });
  return expiresAt;
};
const clearSessionCookie = (res) => res.clearCookie(name, options());
module.exports = { name, setSessionCookie, clearSessionCookie };
