import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/context/LanguageContext";
import axios from "axios";
import HomePage from "@/pages/HomePage";
import RegisterPage from "@/pages/RegisterPage";
import AdminPage from "@/pages/AdminPage";
import ThankYouPage from "@/pages/ThankYouPage";
import MyRegistrationPage from "@/pages/MyRegistrationPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";

axios.defaults.withCredentials = false;

function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/thank-you" element={<ThankYouPage />} />
            <Route path="/my-registration" element={<MyRegistrationPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </LanguageProvider>
    </div>
  );
}

export default App;
