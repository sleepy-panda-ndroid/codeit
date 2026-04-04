import { createBrowserRouter } from "react-router";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/Dashboard";
import IDEPage from "./pages/IDEPage";
import CollaborationPage from "./pages/CollaborationPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  {
    path: "/app",
    Component: DashboardLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "projects", Component: Dashboard },
      { path: "shared", Component: Dashboard },
      { path: "ide/:projectId", Component: IDEPage },
      { path: "collaboration/:projectId", Component: CollaborationPage },
      { path: "settings", Component: SettingsPage },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
