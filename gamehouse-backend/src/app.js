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

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/experiences', experiencesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/hosts', hostsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/events', eventsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
