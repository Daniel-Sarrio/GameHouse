const express = require('express');
const cors = require('cors');
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
const { authenticate } = require('./middleware/authentication');
const { adminWrites, authorizeRoles } = require('./middleware/authorization');
const AppError = require('./services/utils/app-error');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200').split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError('Origin not allowed', 403));
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '32kb' }));

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

app.use(notFound);
app.use(errorHandler);

module.exports = app;
