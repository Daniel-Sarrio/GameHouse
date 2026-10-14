const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const experiencesRoutes = require('./routes/experiences.routes');
const notFound = require('./middleware/not-found.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/experiences', experiencesRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
