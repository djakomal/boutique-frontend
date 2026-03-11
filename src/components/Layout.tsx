import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastContainer from './Toast';
import { useToast } from '../hooks/useToast';
import { createContext, useContext, useState } from 'react';
import { Menu } from 'lucide-react';

// Context global pour les toasts
type ToastFn = {
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastFn>({
  success: () => {},
  error:   () => {},
  warning: () => {},
  info:    () => {},
});

export const useAppToast = () => useContext(ToastContext);

export default function Layout() {
  const { toasts, toast, removeToast } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <ToastContext.Provider value={toast}>
      <div className="flex min-h-screen">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 overflow-auto">
          {/* Topbar mobile */}
          <div className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-700"
                aria-label="Ouvrir le menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="font-semibold text-slate-800">BoutiqueFood</div>
            </div>
          </div>

          <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fadeIn">
            <Outlet />
          </div>
        </main>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </ToastContext.Provider>
  );
}
