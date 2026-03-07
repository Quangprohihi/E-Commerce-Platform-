const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const app = require('./src/app');
const routes = require('./src/routes');
const errorMiddleware = require('./src/middlewares/error.middleware');

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ status: 404, message: 'Not Found' });
});
app.use(errorMiddleware);

const orderService = require('./src/services/order.service');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  orderService.startAutoDeliverJob();
});
