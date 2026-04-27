import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/context/LanguageContext";
import axios from "axios";
import { installRoleInterceptor } from "@/lib/roleGuard";
import HomePage from "@/pages/HomePage";
import RegisterPage from "@/pages/RegisterPage";
import AdminPage from "@/pages/AdminPage";
import ThankYouPage from "@/pages/ThankYouPage";
import MyRegistrationPage from "@/pages/MyRegistrationPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import Demo1Page from "@/pages/Demo1Page";
import Demo2Page from "@/pages/Demo2Page";
import DemoSubmissionDisabledPage from "@/pages/DemoSubmissionDisabledPage";

axios.defaults.withCredentials = false;
installRoleInterceptor();

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
            <Route path="/demo1" element={<Demo1Page />} />
            <Route path="/demo2" element={<Demo2Page />} />
            <Route path="/demo-disabled" element={<DemoSubmissionDisabledPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </LanguageProvider>
    </div>
  );
}

export default App;
