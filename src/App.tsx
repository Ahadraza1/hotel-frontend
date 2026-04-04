import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BranchWorkspaceProvider } from "@/contexts/BranchWorkspaceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmProvider } from "@/components/confirm/ConfirmProvider";
import ModuleErrorBoundary from "@/components/routing/ModuleErrorBoundary";

// SUPER ADMIN PAGES
import Dashboard from "./pages/superadmin/Dashboard";
// import CorporateDashboard from "./pages/superadmin/CorporateDashboard";
import Organizations from "./pages/superadmin/organization/Organizations";
import AddOrganization from "./pages/superadmin/organization/AddOrganization";
import BranchManagement from "./pages/superadmin/branch/BranchManagement";
import AddBranch from "@/pages/superadmin/branch/AddBranch";
import EditBranch from "./pages/superadmin/branch/EditBranch";
import SubscriptionPlans from "./pages/superadmin/subscription/SubscriptionPlans";
import UsersRoles from "./pages/superadmin/UsersRoles";
import RolePermissionEditor from "./pages/superadmin/RolePermissionEditor";
import GlobalFinance from "./pages/superadmin/financialReport";
import Analytics from "./pages/superadmin/Analytics";
import SecurityAudit from "./pages/superadmin/SecurityAudit";
import Integrations from "./pages/superadmin/Integrations";
import SystemSettings from "./pages/superadmin/SystemSettings";
import Login from "./pages/superadmin/Login";
import LandingPage from "./pages/LandingPage";
import ContactUs from "./pages/ContactUs";
import PricingPage from "./pages/PricingPage";
import FinalizeOrderPage from "./pages/FinalizeOrderPage";
import PaymentFailedPage from "./pages/PaymentFailedPage";
import NotFound from "./pages/superadmin/NotFound";
import Profile from "./pages/superadmin/profile/Profile";
import UpdatePassword from "./pages/superadmin/profile/UpdatePassword";
import AcceptInvite from "./pages/superadmin/AcceptInvite";
import OrganizationSignup from "./pages/OrganizationSignup";
import SubscriptionAccess from "./pages/SubscriptionAccess";

// ORGANIZATION PAGES
import OrganizationView from "./pages/superadmin/organization/OrganizationView";
import OrganizationEdit from "./pages/superadmin/organization/OrganizationEdit";

// WORKSPACE PAGES
import BranchWorkspaceLayout from "./pages/workspace/BranchWorkspaceLayout";
import BranchOverview from "./pages/workspace/BranchOverview";
import Rooms from "./pages/workspace/rooms/Rooms";
import AddRoom from "./pages/workspace/rooms/AddRoom";
import EditRoom from "./pages/workspace/rooms/EditRoom";
import Bookings from "./pages/workspace/bookings/Bookings";
import AddBooking from "./pages/workspace/bookings/AddBooking";
import EditBooking from "./pages/workspace/bookings/EditBooking";
import ViewBooking from "./pages/workspace/bookings/ViewBooking";
import CRM from "./pages/workspace/guest/CRM";
import AddGuest from "./pages/workspace/guest/AddGuest";
import Housekeeping from "./pages/workspace/houseKeeping/Housekeeping";
import CreateHousekeepingTask from "./pages/workspace/houseKeeping/CreateHousekeepingTask";
import POS from "./pages/workspace/pos/POS";
import Kitchen from "./pages/workspace/Kitchen";
import OrderSessions from "./pages/workspace/orderSession/OrderSessions";
import OrderSessionDetail from "./pages/workspace/orderSession/OrderSessionDetail";
import AddPOSCategory from "./pages/workspace/pos/AddPOSCategory";
import AddPOSMenu from "./pages/workspace/pos/AddPOSMenu";
import Inventory from "./pages/workspace/inventory/Inventory";
import CreatePurchaseOrder from "./pages/workspace/inventory/CreatePurchaseOrder";
import HR from "./pages/workspace/hr/HR";
import AddStaff from "./pages/workspace/hr/AddStaff";
import Finance from "./pages/workspace/Finance";
import BranchSettings from "./pages/workspace/BranchSettings";
import Notifications from "./pages/Notifications";
import PlatformUsers from "./pages/platform/PlatformUsers";

const queryClient = new QueryClient();

const withModuleErrorBoundary = (moduleName: string, element: ReactNode) => (
  <ModuleErrorBoundary moduleName={moduleName}>{element}</ModuleErrorBoundary>
);

const App = () => {
  const handleLogin = () => {};

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    window.location.href = "/login";
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmProvider>
          <SystemSettingsProvider>
            <AuthProvider>
              <BranchWorkspaceProvider>
                <BrowserRouter>
                  <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/finalize-order" element={<FinalizeOrderPage />} />
                <Route path="/payment-failed" element={<PaymentFailedPage />} />
                <Route
                  path="/login"
                  element={<Login onLogin={handleLogin} />}
                />
                <Route path="/signup" element={<OrganizationSignup />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />

                {/* PROTECTED ROUTES */}
                <Route
                  path="*"
                  element={
                    <AppLayout onLogout={handleLogout}>
                      <Routes>
                        <Route
                          path="/unauthorized"
                          element={
                            <div className="unauthorized-container">

                              <h1>403 - Access Denied</h1>
                              <p>
                                You don't have permission to view this page.
                              </p>
                            </div>
                          }
                        />

                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              {withModuleErrorBoundary("Dashboard", <Dashboard />)}
                            </ProtectedRoute>
                          }
                        />

                        {/* <Route
                          path="/corporate-dashboard"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              <CorporateDashboard />
                            </ProtectedRoute>
                          }
                        /> */}

                        <Route
                          path="/organizations"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              {withModuleErrorBoundary("Organizations", <Organizations />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/organizations/add"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              {withModuleErrorBoundary("Add Organization", <AddOrganization />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/organizations/view/:id"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              {withModuleErrorBoundary("Organization Details", <OrganizationView />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/organizations/edit/:id"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              {withModuleErrorBoundary("Edit Organization", <OrganizationEdit />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/subscriptions"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              {withModuleErrorBoundary("Subscription Plans", <SubscriptionPlans />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/subscription-access"
                          element={
                            <ProtectedRoute>
                              {withModuleErrorBoundary("Subscription Access", <SubscriptionAccess />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/branches"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              {withModuleErrorBoundary("Branch Management", <BranchManagement />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/branches/add"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              {withModuleErrorBoundary("Add Branch", <AddBranch />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/branches/edit/:id"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              {withModuleErrorBoundary("Edit Branch", <EditBranch />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/financial-reports"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "ACCOUNTANT"]}
                            >
                              {withModuleErrorBoundary("Financial Reports", <GlobalFinance />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/users"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              {withModuleErrorBoundary("Users & Roles", <UsersRoles />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/platform/users"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              {withModuleErrorBoundary("Platform Users", <PlatformUsers />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/permissions"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                              permission="ACCESS_ROLE_PERMISSIONS_PAGE"
                            >
                              {withModuleErrorBoundary("Role Permissions", <RolePermissionEditor />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/analytics"
                          element={withModuleErrorBoundary("Analytics", <Analytics />)}
                        />
                        <Route
                          path="/security"
                          element={withModuleErrorBoundary("Security Audit", <SecurityAudit />)}
                        />
                        <Route
                          path="/integrations"
                          element={withModuleErrorBoundary("Integrations", <Integrations />)}
                        />
                        <Route
                          path="/settings"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              {withModuleErrorBoundary("System Settings", <SystemSettings />)}
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/notifications"
                          element={
                            <ProtectedRoute>
                              {withModuleErrorBoundary("Notifications", <Notifications />)}
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/workspace/:branchId"
                          element={
                            <ProtectedRoute>
                              <BranchWorkspaceLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route
                            index
                            element={withModuleErrorBoundary("Branch Overview", <BranchOverview />)}
                          />
                          <Route
                            path="overview"
                            element={withModuleErrorBoundary("Branch Overview", <BranchOverview />)}
                          />

                          <Route
                            path="rooms"
                            element={
                              <ProtectedRoute permission="ACCESS_ROOMS">
                                {withModuleErrorBoundary("Rooms", <Rooms />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="rooms/add"
                            element={
                              <ProtectedRoute permission="ACCESS_ROOMS">
                                {withModuleErrorBoundary("Add Room", <AddRoom />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="rooms/edit/:roomId"
                            element={
                              <ProtectedRoute permission="ACCESS_ROOMS">
                                {withModuleErrorBoundary("Edit Room", <EditRoom />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bookings"
                            element={
                              <ProtectedRoute permission="ACCESS_BOOKINGS">
                                {withModuleErrorBoundary("Bookings", <Bookings />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bookings/add"
                            element={
                              <ProtectedRoute permission="ACCESS_BOOKINGS">
                                {withModuleErrorBoundary("Add Booking", <AddBooking />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bookings/edit/:bookingId"
                            element={
                              <ProtectedRoute permission="UPDATE_BOOKING">
                                {withModuleErrorBoundary("Edit Booking", <EditBooking />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bookings/:bookingId"
                            element={
                              <ProtectedRoute permission="ACCESS_BOOKINGS">
                                {withModuleErrorBoundary("Booking Details", <ViewBooking />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="crm"
                            element={
                              <ProtectedRoute permission="ACCESS_CRM">
                                {withModuleErrorBoundary("CRM", <CRM />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="crm/add"
                            element={
                              <ProtectedRoute permission="ACCESS_CRM">
                                {withModuleErrorBoundary("Add Guest", <AddGuest />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="crm/edit/:guestId"
                            element={
                              <ProtectedRoute permission="ACCESS_CRM">
                                {withModuleErrorBoundary("Edit Guest", <AddGuest />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="housekeeping"
                            element={
                              <ProtectedRoute permission="ACCESS_HOUSEKEEPING">
                                {withModuleErrorBoundary("Housekeeping", <Housekeeping />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="housekeeping/add"
                            element={
                              <ProtectedRoute permission="ACCESS_HOUSEKEEPING">
                                {withModuleErrorBoundary("Create Housekeeping Task", <CreateHousekeepingTask />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("POS", <POS />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="order-sessions"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("Order Sessions", <OrderSessions />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="order-sessions/new"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("New Order Session", <OrderSessionDetail />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="order-sessions/:sessionId"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("Order Session Detail", <OrderSessionDetail />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos/category/add"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("Add POS Category", <AddPOSCategory />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos/category/edit/:categoryId"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("Edit POS Category", <AddPOSCategory />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos/menu/add"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("Add POS Menu", <AddPOSMenu />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos/menu/edit/:itemId"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("Edit POS Menu", <AddPOSMenu />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="kitchen"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                {withModuleErrorBoundary("Kitchen Display", <Kitchen />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="inventory"
                            element={
                              <ProtectedRoute permission="ACCESS_INVENTORY">
                                {withModuleErrorBoundary("Inventory", <Inventory />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="inventory/add"
                            element={
                              <ProtectedRoute permission="ACCESS_INVENTORY">
                                {withModuleErrorBoundary("Create Purchase Order", <CreatePurchaseOrder />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="hr"
                            element={
                              <ProtectedRoute permission="ACCESS_HR">
                                {withModuleErrorBoundary("HR", <HR />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="hr/add"
                            element={
                              <ProtectedRoute permission="ACCESS_HR">
                                {withModuleErrorBoundary("Add Staff", <AddStaff />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="finance"
                            element={
                              <ProtectedRoute permission="ACCESS_FINANCE">
                                {withModuleErrorBoundary("Finance", <Finance />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings"
                            element={
                              <ProtectedRoute permission="ACCESS_BRANCH_SETTINGS">
                                {withModuleErrorBoundary("Branch Settings", <BranchSettings />)}
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="notifications"
                            element={
                              <ProtectedRoute>
                                {withModuleErrorBoundary("Notifications", <Notifications />)}
                              </ProtectedRoute>
                            }
                          />
                        </Route>

                        <Route
                          path="/profile"
                          element={withModuleErrorBoundary("Profile", <Profile />)}
                        />
                        <Route
                          path="/update-password"
                          element={withModuleErrorBoundary("Update Password", <UpdatePassword />)}
                        />

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
                  }
                />
                  </Routes>
                </BrowserRouter>
              </BranchWorkspaceProvider>
            </AuthProvider>
          </SystemSettingsProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
