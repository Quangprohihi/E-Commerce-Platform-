/**
 * Express app with all routes mounted. Used by index.js and by test suite.
 */
const app = require('./app');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

app.use('/api', routes);
app.use((req, res) => {
  res.status(404).json({ status: 404, message: 'Not Found' });
});
app.use(errorMiddleware);

module.exports = app;
