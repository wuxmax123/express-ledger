import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider, theme } from 'antd';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import { Layout } from './components/Layout';
import RateImport from "./pages/RateImport";
import RateDiff from "./pages/RateDiff";
import RateHistory from "./pages/RateHistory";
import RateBrowse from "./pages/RateBrowse";
import RateCompare from "./pages/RateCompare";
import Vendors from "./pages/Vendors";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ApprovalCenter from "./pages/ApprovalCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#0080FF',
            colorInfo: '#0080FF',
            borderRadius: 8,
          },
          algorithm: theme.defaultAlgorithm
        }}
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<Layout><RateImport /></Layout>} />
              <Route path="/rates/import" element={<Layout><RateImport /></Layout>} />
              <Route path="/rates/diff" element={<Layout><RateDiff /></Layout>} />
              <Route path="/rates/history" element={<Layout><RateHistory /></Layout>} />
              <Route path="/rates/history/:channelId" element={<Layout><RateHistory /></Layout>} />
              <Route path="/rates/browse" element={<Layout><RateBrowse /></Layout>} />
              <Route path="/rates/compare" element={<Layout><RateCompare /></Layout>} />
              <Route path="/vendors" element={<Layout><Vendors /></Layout>} />
              <Route path="/approval" element={<Layout><ApprovalCenter /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ConfigProvider>
    </I18nextProvider>
  </QueryClientProvider>
);

export default App;
