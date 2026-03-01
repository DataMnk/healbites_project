import { createBrowserRouter } from "react-router-dom";
import HomePage from "../pages/HomePage.tsx";
import SignInPage from "../pages/auth/SignInPage.tsx";
import SignUpPage from "../pages/auth/SignUpPage.tsx";
import DashboardPage from "../pages/DashboardPage.tsx";
import OnboardingPage from "../pages/OnboardingPage.tsx";
import MealPlanPage from "../pages/MealPlanPage.tsx";
import ShoppingListPage from "../pages/ShoppingListPage.tsx";
import ChatPage from "../pages/ChatPage.tsx";
import NotFoundPage from "../pages/404Page.tsx";
import AuthProtectedRoute from "./AuthProtectedRoute.tsx";
import Providers from "../Providers.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Providers />,
    children: [
      // Public routes
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/auth/sign-in",
        element: <SignInPage />,
      },
      {
        path: "/auth/sign-up",
        element: <SignUpPage />,
      },
      // Auth Protected routes
      {
        path: "/",
        element: <AuthProtectedRoute />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/onboarding",
            element: <OnboardingPage />,
          },
          {
            path: "/meal-plan",
            element: <MealPlanPage />,
          },
          {
            path: "/shopping-list",
            element: <ShoppingListPage />,
          },
          {
            path: "/chat",
            element: <ChatPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
