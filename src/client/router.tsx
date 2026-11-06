import { createBrowserRouter } from "react-router";
import { Landing } from "./routes/Landing";
import { Login } from "./routes/Login";
import { NotFound } from "./routes/NotFound";

// Landing and login load immediately; the signed-in app (charts, forms) loads on demand,
// so first-time visitors don't download the chart library.
export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  {
    path: "/app",
    lazy: async () => ({ Component: (await import("./routes/AppLayout")).AppLayout }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import("./routes/Overview")).Overview }) },
      { path: "vitals", lazy: async () => ({ Component: (await import("./routes/Vitals")).Vitals }) },
      { path: "medications", lazy: async () => ({ Component: (await import("./routes/Medications")).Medications }) },
      { path: "symptoms", lazy: async () => ({ Component: (await import("./routes/Symptoms")).Symptoms }) },
      { path: "profile", lazy: async () => ({ Component: (await import("./routes/Profile")).Profile }) },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
