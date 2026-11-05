import { createBrowserRouter } from "react-router";
import { AppLayout } from "./routes/AppLayout";
import { Dashboard } from "./routes/Dashboard";
import { Landing } from "./routes/Landing";
import { Login } from "./routes/Login";
import { NotFound } from "./routes/NotFound";

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [{ index: true, element: <Dashboard /> }],
  },
  { path: "*", element: <NotFound /> },
]);
