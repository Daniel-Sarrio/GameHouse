// Cookies de sesión: HttpOnly (JavaScript no puede leerlas), SameSite=Strict y Secure en producción.
// El refresh token solo viaja a /api/auth, nunca al resto de la API.
const names = { access: 'gamehouse_access', refresh: 'gamehouse_refresh' };
// Cookie del esquema anterior (un único JWT); se elimina al iniciar o cerrar sesión.
const legacyName = 'gamehouse_session';
const paths = { access: '/api', refresh: '/api/auth' };

const options = (path) => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path,
});

const setAccessCookie = (res, { token, expiresAt }) => {
  res.cookie(names.access, token, { ...options(paths.access), expires: expiresAt });
};

const setAuthCookies = (res, { access, refresh }) => {
  setAccessCookie(res, access);
  res.cookie(names.refresh, refresh.token, { ...options(paths.refresh), expires: refresh.expiresAt });
  res.clearCookie(legacyName, { ...options('/api'), sameSite: 'lax' });
};

const clearAuthCookies = (res) => {
  res.clearCookie(names.access, options(paths.access));
  res.clearCookie(names.refresh, options(paths.refresh));
  res.clearCookie(legacyName, { ...options('/api'), sameSite: 'lax' });
};

const readAuthCookies = (req) => ({
  accessToken: req.cookies?.[names.access] || null,
  refreshToken: req.cookies?.[names.refresh] || null,
});

const hasAuthCookie = (req) => [names.access, names.refresh, legacyName].some((name) => req.cookies?.[name]);

module.exports = { names, setAccessCookie, setAuthCookies, clearAuthCookies, readAuthCookies, hasAuthCookie };
