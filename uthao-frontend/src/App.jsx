import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Navbar from "./components/Navbar";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Navbar />
          <main className="max-w-2xl mx-auto px-5 py-8 pb-16">
            <AppRoutes />
          </main>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
