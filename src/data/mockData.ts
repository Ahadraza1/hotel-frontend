// export interface Branch {
//   id: string;
//   name: string;
//   organization: string;
//   country: string;
//   status: "active" | "inactive" | "maintenance";
//   rooms: number;
//   occupancy: number;
//   revenue: number;
// }

// export interface Organization {
//   id: string;
//   name: string;
//   branches: number;
//   plan: string;
//   status: "active" | "suspended" | "trial";
//   revenue: number;
//   admins: string[];
//   users: number;
// }

// export const branches: Branch[] = [
//   { id: "b1", name: "The Grand Palace – Dubai", organization: "Royal Hospitality Group", country: "UAE", status: "active", rooms: 420, occupancy: 87, revenue: 284000 },
//   { id: "b2", name: "Le Château – Paris", organization: "Royal Hospitality Group", country: "France", status: "active", rooms: 310, occupancy: 92, revenue: 312000 },
//   { id: "b3", name: "The Crown – London", organization: "Crown Hotels Int'l", country: "UK", status: "active", rooms: 280, occupancy: 78, revenue: 198000 },
//   { id: "b4", name: "Sakura Imperial – Tokyo", organization: "Crown Hotels Int'l", country: "Japan", status: "maintenance", rooms: 350, occupancy: 0, revenue: 0 },
//   { id: "b5", name: "The Pinnacle – New York", organization: "Pinnacle Luxury Resorts", country: "USA", status: "active", rooms: 500, occupancy: 83, revenue: 425000 },
//   { id: "b6", name: "Azure Coast – Maldives", organization: "Pinnacle Luxury Resorts", country: "Maldives", status: "active", rooms: 120, occupancy: 95, revenue: 380000 },
// ];

// export const organizations: Organization[] = [
//   { id: "o1", name: "Royal Hospitality Group", branches: 2, plan: "Enterprise", status: "active", revenue: 596000, admins: ["James Whitfield", "Sarah Chen"], users: 124 },
//   { id: "o2", name: "Crown Hotels Int'l", branches: 2, plan: "Professional", status: "active", revenue: 198000, admins: ["Michael Brooks"], users: 45 },
//   { id: "o3", name: "Pinnacle Luxury Resorts", branches: 2, plan: "Enterprise", status: "active", revenue: 805000, admins: ["Elena Rodriguez", "David Kim"], users: 312 },
//   { id: "o4", name: "Emerald Bay Hotels", branches: 0, plan: "Starter", status: "trial", revenue: 0, admins: ["Priya Sharma"], users: 8 },
//   { id: "o5", name: "Luxe Hotels Corp", branches: 24, plan: "Enterprise", status: "active", revenue: 1200000, admins: ["James Mitchell"], users: 312 },
//   { id: "o6", name: "Pacific Resorts Group", branches: 18, plan: "Enterprise", status: "active", revenue: 980000, admins: ["Sarah Chen"], users: 245 },
//   { id: "o7", name: "Alpine Hospitality", branches: 12, plan: "Professional", status: "active", revenue: 450000, admins: ["Marcus Weber"], users: 156 },
//   { id: "o8", name: "Coastal Inn Partners", branches: 8, plan: "Professional", status: "active", revenue: 320000, admins: ["Elena Rodriguez"], users: 89 },
//   { id: "o9", name: "Metro Stay Hotels", branches: 15, plan: "Enterprise", status: "suspended", revenue: 0, admins: ["David Kim"], users: 198 },
//   { id: "o10", name: "Heritage Hotels Ltd", branches: 6, plan: "Standard", status: "active", revenue: 198000, admins: ["Priya Sharma"], users: 72 },
//   { id: "o11", name: "Urban Lodge Co", branches: 4, plan: "Standard", status: "trial", revenue: 52000, admins: ["Tom Hansen"], users: 45 },
//   { id: "o12", name: "Royal Palms Group", branches: 20, plan: "Enterprise", status: "active", revenue: 1500000, admins: ["Ahmed Al-Rashid"], users: 267 },
// ];

// export const kpiData = {
//   totalOrganizations: 4,
//   totalBranches: 6,
//   activeUsers: 1247,
//   globalRevenue: 1599000,
//   occupancy: 84,
//   systemHealth: 99.7,
// };

// export const revenueData = [
//   { month: "Aug", revenue: 980000 },
//   { month: "Sep", revenue: 1120000 },
//   { month: "Oct", revenue: 1250000 },
//   { month: "Nov", revenue: 1180000 },
//   { month: "Dec", revenue: 1420000 },
//   { month: "Jan", revenue: 1380000 },
//   { month: "Feb", revenue: 1599000 },
// ];

// export const activityFeed = [
//   { id: 1, type: "success", message: "Azure Coast – Maldives reached 95% occupancy", time: "2 min ago" },
//   { id: 2, type: "warning", message: "Sakura Imperial – Tokyo entered maintenance mode", time: "15 min ago" },
//   { id: 3, type: "info", message: "New admin added to Royal Hospitality Group", time: "1 hr ago" },
//   { id: 4, type: "danger", message: "Suspicious login attempt from IP 192.168.4.55", time: "2 hr ago" },
//   { id: 5, type: "success", message: "Monthly revenue target exceeded by 12%", time: "3 hr ago" },
//   { id: 6, type: "info", message: "Emerald Bay Hotels started trial period", time: "5 hr ago" },
//   { id: 7, type: "warning", message: "Crown Hotels Int'l subscription expiring in 7 days", time: "6 hr ago" },
// ];

// export const branchPermissions: Record<string, string[]> = {
//   b1: ["bookings", "rooms", "financial_reports", "hr", "inventory", "crm", "reports"],
//   b2: ["bookings", "rooms", "financial_reports", "reports"],
//   b3: ["bookings", "rooms", "hr", "crm", "reports"],
//   b4: [],
//   b5: ["bookings", "rooms", "financial_reports", "hr", "inventory", "crm", "reports"],
//   b6: ["bookings", "rooms", "financial_reports", "crm"],
// };

// // Branch-specific workspace mock data
// export const branchWorkspaceData: Record<string, {
//   todayRevenue: number;
//   todayCheckIns: number;
//   todayCheckOuts: number;
//   pendingRequests: number;
//   staffOnDuty: number;
//   vipGuests: number;
//   recentActivity: { message: string; time: string; type: string }[];
//   roomBreakdown: { type: string; total: number; occupied: number }[];
// }> = {
//   b1: {
//     todayRevenue: 42800,
//     todayCheckIns: 34,
//     todayCheckOuts: 28,
//     pendingRequests: 12,
//     staffOnDuty: 87,
//     vipGuests: 6,
//     recentActivity: [
//       { message: "VIP Suite 1801 – Guest arrival confirmed", time: "5 min ago", type: "success" },
//       { message: "Housekeeping alert: Floor 12 delay", time: "18 min ago", type: "warning" },
//       { message: "Restaurant reservation overflow for tonight", time: "45 min ago", type: "info" },
//       { message: "Spa system maintenance scheduled 2AM", time: "1 hr ago", type: "info" },
//     ],
//     roomBreakdown: [
//       { type: "Standard", total: 180, occupied: 156 },
//       { type: "Deluxe", total: 120, occupied: 108 },
//       { type: "Suite", total: 80, occupied: 68 },
//       { type: "Presidential", total: 40, occupied: 33 },
//     ],
//   },
//   b2: {
//     todayRevenue: 51200,
//     todayCheckIns: 22,
//     todayCheckOuts: 19,
//     pendingRequests: 8,
//     staffOnDuty: 64,
//     vipGuests: 4,
//     recentActivity: [
//       { message: "Penthouse booked for Paris Fashion Week", time: "10 min ago", type: "success" },
//       { message: "Wine cellar inventory low – reorder needed", time: "30 min ago", type: "warning" },
//       { message: "Guest feedback: 5-star review submitted", time: "1 hr ago", type: "success" },
//     ],
//     roomBreakdown: [
//       { type: "Classique", total: 140, occupied: 130 },
//       { type: "Supérieure", total: 100, occupied: 92 },
//       { type: "Suite", total: 50, occupied: 46 },
//       { type: "Royale", total: 20, occupied: 18 },
//     ],
//   },
//   b3: {
//     todayRevenue: 31500,
//     todayCheckIns: 18,
//     todayCheckOuts: 21,
//     pendingRequests: 5,
//     staffOnDuty: 52,
//     vipGuests: 3,
//     recentActivity: [
//       { message: "Afternoon tea service fully booked", time: "15 min ago", type: "info" },
//       { message: "Fire drill scheduled for tomorrow 10AM", time: "2 hr ago", type: "warning" },
//     ],
//     roomBreakdown: [
//       { type: "Classic", total: 120, occupied: 92 },
//       { type: "Premium", total: 90, occupied: 72 },
//       { type: "Suite", total: 50, occupied: 40 },
//       { type: "Royal Suite", total: 20, occupied: 14 },
//     ],
//   },
//   b5: {
//     todayRevenue: 68400,
//     todayCheckIns: 41,
//     todayCheckOuts: 35,
//     pendingRequests: 19,
//     staffOnDuty: 112,
//     vipGuests: 9,
//     recentActivity: [
//       { message: "Celebrity check-in – Security protocol active", time: "3 min ago", type: "success" },
//       { message: "Rooftop bar at capacity", time: "25 min ago", type: "warning" },
//       { message: "Corporate event setup in Ballroom A", time: "1 hr ago", type: "info" },
//     ],
//     roomBreakdown: [
//       { type: "Standard", total: 200, occupied: 168 },
//       { type: "Deluxe", total: 150, occupied: 124 },
//       { type: "Suite", total: 100, occupied: 80 },
//       { type: "Penthouse", total: 50, occupied: 43 },
//     ],
//   },
//   b6: {
//     todayRevenue: 92100,
//     todayCheckIns: 8,
//     todayCheckOuts: 5,
//     pendingRequests: 3,
//     staffOnDuty: 45,
//     vipGuests: 8,
//     recentActivity: [
//       { message: "Private island villa prepared for arrival", time: "20 min ago", type: "success" },
//       { message: "Sunset cruise fully booked tonight", time: "40 min ago", type: "info" },
//       { message: "Underwater restaurant reservation confirmed", time: "1 hr ago", type: "success" },
//     ],
//     roomBreakdown: [
//       { type: "Water Villa", total: 50, occupied: 48 },
//       { type: "Beach Villa", total: 40, occupied: 38 },
//       { type: "Ocean Suite", total: 20, occupied: 19 },
//       { type: "Royal Residence", total: 10, occupied: 9 },
//     ],
//   },
// };

// export const rolePermissions = [
//   { category: "System", permissions: ["View Dashboard", "Manage Settings", "View Audit Logs", "Manage Integrations"] },
//   { category: "Booking", permissions: ["Create Booking", "Edit Booking", "Cancel Booking", "View All Bookings", "Manage Rates"] },
//   { category: "Rooms", permissions: ["View Rooms", "Edit Room Status", "Manage Room Types", "Housekeeping"] },
//   { category: "Finance", permissions: ["View Revenue", "Process Refunds", "Manage Invoices", "Export Reports"] },
//   { category: "HR", permissions: ["View Staff", "Manage Shifts", "Payroll Access", "Performance Reviews"] },
//   { category: "Inventory", permissions: ["View Stock", "Purchase Orders", "Stock Alerts", "Vendor Management"] },
//   { category: "CRM", permissions: ["View Guests", "Loyalty Program", "Feedback Management", "Marketing Campaigns"] },
// ];

// export const roles = ["Super Admin", "Corporate Admin", "Branch Manager", "Front Desk", "Housekeeping Lead", "Finance Manager", "HR Manager"];
