import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './components/auth/RouteGuards';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CartPage from './pages/CartPage';
import ComparePage from './pages/ComparePage';
import CheckoutPage from './pages/CheckoutPage';
import SellerWarehousePage from './pages/SellerWarehousePage';
import PaymentResultPage from './pages/PaymentResultPage';
import {
  AdminKycPage,
  AdminReportsPage,
  AdminSystemPage,
  AdminUsersPage,
  AdminDashboardPage,
  BuyerDashboardPage,
  BuyerOrdersPage,
  BuyerProfilePage,
  BuyerReviewsPage,
  SellerKycPage,
  SellerOrdersPage,
  SellerProductsPage,
  SellerDashboardPage,
  SellerWalletPage,
  AdminWithdrawalsPage,
  StaffCustomersPage,
  StaffOrdersPage,
  StaffProductsPage,
  StaffReviewsPage,
  StaffSellersPage,
  StaffDashboardPage,
  SettingsPage,
  UnauthorizedPage,
} from './pages/RolePages';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:slug" element={<ProductDetailPage />} />
        <Route path="login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="payment/result" element={<PaymentResultPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        <Route
          path="checkout"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['BUYER', 'SELLER', 'STAFF', 'ADMIN']}>
                <CheckoutPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="account"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['BUYER']}>
                <BuyerDashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="account/orders"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['BUYER']}>
                <BuyerOrdersPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="account/reviews"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['BUYER']}>
                <BuyerReviewsPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="account/profile"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['BUYER']}>
                <BuyerProfilePage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />

        <Route
          path="seller"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SELLER', 'ADMIN']}>
                <SellerDashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="seller/products"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SELLER', 'ADMIN']}>
                <SellerProductsPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="seller/orders"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SELLER', 'ADMIN']}>
                <SellerOrdersPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="seller/kyc"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SELLER', 'ADMIN']}>
                <SellerKycPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="seller/warehouse"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SELLER', 'ADMIN']}>
                <SellerWarehousePage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="seller/wallet"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SELLER', 'ADMIN']}>
                <SellerWalletPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />

        <Route
          path="staff"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STAFF', 'ADMIN']}>
                <StaffDashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="staff/customers"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STAFF', 'ADMIN']}>
                <StaffCustomersPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="staff/sellers"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STAFF', 'ADMIN']}>
                <StaffSellersPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="staff/products"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STAFF', 'ADMIN']}>
                <StaffProductsPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="staff/reviews"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STAFF', 'ADMIN']}>
                <StaffReviewsPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="staff/orders"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STAFF', 'ADMIN']}>
                <StaffOrdersPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="staff/kyc"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STAFF', 'ADMIN']}>
                <AdminKycPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />

        <Route
          path="admin"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="admin/kyc"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STAFF', 'ADMIN']}>
                <AdminKycPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="admin/system"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminSystemPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="admin/reports"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminReportsPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="admin/users"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminUsersPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
        <Route
          path="admin/withdrawals"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ADMIN', 'STAFF']}>
                <AdminWithdrawalsPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />

        <Route
          path="settings"
          element={(
            <ProtectedRoute>
              <RoleRoute allowedRoles={['BUYER', 'SELLER', 'STAFF', 'ADMIN']}>
                <SettingsPage />
              </RoleRoute>
            </ProtectedRoute>
          )}
        />
      </Route>
    </Routes>
  );
}

export default App;
