import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BranchWorkspaceProvider } from "@/contexts/BranchWorkspaceContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfirmProvider } from "@/components/confirm/ConfirmProvider";

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
                              <Dashboard />
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
                              <Organizations />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/organizations/add"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              <AddOrganization />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/organizations/view/:id"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              <OrganizationView />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/organizations/edit/:id"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              <OrganizationEdit />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/subscriptions"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              <SubscriptionPlans />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/subscription-access"
                          element={
                            <ProtectedRoute>
                              <SubscriptionAccess />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/branches"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              <BranchManagement />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/branches/add"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              <AddBranch />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/branches/edit/:id"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              <EditBranch />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/financial-reports"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "ACCOUNTANT"]}
                            >
                              <GlobalFinance />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/users"
                          element={
                            <ProtectedRoute
                              allowedRoles={["SUPER_ADMIN", "CORPORATE_ADMIN"]}
                            >
                              <UsersRoles />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/platform/users"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              <PlatformUsers />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/permissions"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              <RolePermissionEditor />
                            </ProtectedRoute>
                          }
                        />

                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/security" element={<SecurityAudit />} />
                        <Route
                          path="/integrations"
                          element={<Integrations />}
                        />
                        <Route
                          path="/settings"
                          element={
                            <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                              <SystemSettings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/notifications"
                          element={
                            <ProtectedRoute>
                              <Notifications />
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
                          <Route index element={<BranchOverview />} />
                          <Route path="overview" element={<BranchOverview />} />

                          <Route
                            path="rooms"
                            element={
                              <ProtectedRoute permission="ACCESS_ROOMS">
                                <Rooms />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="rooms/add"
                            element={
                              <ProtectedRoute permission="ACCESS_ROOMS">
                                <AddRoom />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="rooms/edit/:roomId"
                            element={
                              <ProtectedRoute permission="ACCESS_ROOMS">
                                <EditRoom />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bookings"
                            element={
                              <ProtectedRoute permission="ACCESS_BOOKINGS">
                                <Bookings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bookings/add"
                            element={
                              <ProtectedRoute permission="ACCESS_BOOKINGS">
                                <AddBooking />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bookings/edit/:bookingId"
                            element={
                              <ProtectedRoute permission="UPDATE_BOOKING">
                                <EditBooking />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="bookings/:bookingId"
                            element={
                              <ProtectedRoute permission="ACCESS_BOOKINGS">
                                <ViewBooking />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="crm"
                            element={
                              <ProtectedRoute permission="ACCESS_CRM">
                                <CRM />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="crm/add"
                            element={
                              <ProtectedRoute permission="ACCESS_CRM">
                                <AddGuest />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="crm/edit/:guestId"
                            element={
                              <ProtectedRoute permission="ACCESS_CRM">
                                <AddGuest />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="housekeeping"
                            element={
                              <ProtectedRoute permission="ACCESS_HOUSEKEEPING">
                                <Housekeeping />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="housekeeping/add"
                            element={
                              <ProtectedRoute permission="ACCESS_HOUSEKEEPING">
                                <CreateHousekeepingTask />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                <POS />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos/category/add"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                <AddPOSCategory />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos/category/edit/:categoryId"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                <AddPOSCategory />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos/menu/add"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                <AddPOSMenu />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="pos/menu/edit/:itemId"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                <AddPOSMenu />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="kitchen"
                            element={
                              <ProtectedRoute permission="ACCESS_POS">
                                <Kitchen />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="inventory"
                            element={
                              <ProtectedRoute permission="ACCESS_INVENTORY">
                                <Inventory />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="inventory/add"
                            element={
                              <ProtectedRoute permission="ACCESS_INVENTORY">
                                <CreatePurchaseOrder />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="hr"
                            element={
                              <ProtectedRoute permission="ACCESS_HR">
                                <HR />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="hr/add"
                            element={
                              <ProtectedRoute permission="ACCESS_HR">
                                <AddStaff />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="finance"
                            element={
                              <ProtectedRoute permission="ACCESS_FINANCE">
                                <Finance />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="settings"
                            element={
                              <ProtectedRoute permission="ACCESS_BRANCH_SETTINGS">
                                <BranchSettings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="notifications"
                            element={
                              <ProtectedRoute>
                                <Notifications />
                              </ProtectedRoute>
                            }
                          />
                        </Route>

                        <Route path="/profile" element={<Profile />} />
                        <Route
                          path="/update-password"
                          element={<UpdatePassword />}
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
