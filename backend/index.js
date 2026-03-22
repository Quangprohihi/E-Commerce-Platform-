const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const app = require('./src/appWithRoutes');

const orderService = require('./src/services/order.service');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  orderService.startAutoDeliverJob();
});
