const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const experiencesRoutes = require('./routes/experiences.routes');
const categoriesRoutes = require('./routes/categories.routes');
const hostsRoutes = require('./routes/hosts.routes');
const locationsRoutes = require('./routes/locations.routes');
const assignmentsRoutes = require('./routes/assignments.routes');
const rolesRoutes = require('./routes/roles.routes');
const eventsRoutes = require('./routes/events.routes');
const notFound = require('./middleware/not-found.middleware');
const errorHandler = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const profilesRoutes = require('./routes/profiles.routes');
const userRoutes = require('./routes/user.routes');
const shopRoutes = require('./routes/shop.routes');
const commentsRoutes = require('./routes/comments.routes');
const likesRoutes = require('./routes/likes.routes');
const { authenticate } = require('./middleware/authentication');
const { adminWrites, authorizeRoles } = require('./middleware/authorization');
const AppError = require('./services/utils/app-error');
const { hasAuthCookie } = require('./services/utils/auth-cookie');

const app = express();
// Se accede a través del API Gateway (puerto 4000): se confía en su X-Forwarded-For para que req.ip
// (y los límites de intentos de login/registro) usen la IP real del cliente y no la del gateway.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200').split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError('Origin not allowed', 403));
  },
  // La sesión viaja solo en cookies HttpOnly; no se acepta Authorization: Bearer.
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
  methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
// Las escrituras con cookies requieren un header que un formulario externo no puede enviar.
app.use((req, res, next) => {
  if (hasAuthCookie(req) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    && req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return next(new AppError('Invalid request origin', 403));
  }
  return next();
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/users', userRoutes);

app.use('/api/experiences', experiencesRoutes);
app.use('/api/categories', adminWrites, categoriesRoutes);
app.use('/api/hosts', adminWrites, hostsRoutes);
app.use('/api/locations', adminWrites, locationsRoutes);
app.use('/api/assignments', adminWrites, assignmentsRoutes);
app.use('/api/roles', authenticate, authorizeRoles('ADMIN'), rolesRoutes);
app.use('/api/events', adminWrites, eventsRoutes);
// Shop público de solo lectura (home, listado y detalle).
app.use('/api/shop', shopRoutes);
// Comentarios: leer es público; crear y borrar requieren sesión (middleware authenticate).
app.use('/api/shop/experiences/:slug/comments', commentsRoutes);
// Likes: todas sus rutas pasan por el middleware authenticate.
app.use('/api/likes', likesRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
