import { createBrowserRouter, Navigate, useParams } from "react-router";
import { Landing } from "./routes/Landing";
import { Login } from "./routes/Login";
import { NotFound } from "./routes/NotFound";

// Landing and login load immediately; the signed-in app (charts, forms) loads on demand,
// so first-time visitors don't download the chart library.
export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", lazy: async () => ({ Component: (await import("./routes/SignUp")).SignUp }) },
  { path: "/verify-email", lazy: async () => ({ Component: (await import("./routes/VerifyEmail")).VerifyEmail }) },
  { path: "/forgot-password", lazy: async () => ({ Component: (await import("./routes/ForgotPassword")).ForgotPassword }) },
  { path: "/privacy", lazy: async () => ({ Component: (await import("./routes/Legal")).Privacy }) },
  { path: "/terms", lazy: async () => ({ Component: (await import("./routes/Legal")).Terms }) },
  { path: "/share/:token", lazy: async () => ({ Component: (await import("./routes/SharedView")).SharedView }) },
  {
    path: "/app",
    lazy: async () => ({ Component: (await import("./routes/AppLayout")).AppLayout }),
    children: [
      { index: true, lazy: async () => ({ Component: (await import("./routes/Overview")).Overview }) },
      { path: "assistant", lazy: async () => ({ Component: (await import("./routes/Assistant")).Assistant }) },
      { path: "vitals", lazy: async () => ({ Component: (await import("./routes/Vitals")).Vitals }) },
      { path: "medications", lazy: async () => ({ Component: (await import("./routes/Medications")).Medications }) },
      { path: "symptoms", lazy: async () => ({ Component: (await import("./routes/Symptoms")).Symptoms }) },
      { path: "reports", lazy: async () => ({ Component: (await import("./routes/Reports")).Reports }) },
      { path: "reports/share", lazy: async () => ({ Component: (await import("./routes/ShareReports")).ShareReports }) },
      { path: "care", lazy: async () => ({ Component: (await import("./routes/Caring")).CaringList }) },
      { path: "care/accept/:token", lazy: async () => ({ Component: (await import("./routes/Caring")).AcceptInvite }) },
      { path: "care/:patientId", lazy: async () => ({ Component: (await import("./routes/Caring")).CareDashboard }) },
      { path: "timeline", lazy: async () => ({ Component: (await import("./routes/Timeline")).Timeline }) },
      { path: "visit", lazy: async () => ({ Component: (await import("./routes/Visit")).Visit }) },
      { path: "profile", lazy: async () => ({ Component: (await import("./routes/Profile")).Profile }) },
    ],
  },
  // Invite links in emails point here; the app route asks for sign-in first if needed.
  { path: "/care/accept/:token", element: <InviteRedirect /> },
  { path: "*", element: <NotFound /> },
]);

function InviteRedirect() {
  const { token = "" } = useParams();
  return <Navigate to={`/app/care/accept/${token}`} replace />;
}
