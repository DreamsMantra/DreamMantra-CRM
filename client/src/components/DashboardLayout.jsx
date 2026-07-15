import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import NotificationBell from './NotificationBell';

export default function DashboardLayout({
  sidebarLinks, children, title, badge, headerActions, activeTab, onTabChange,
  notificationItems, onNotificationClick, onNotificationMarkAll,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNav = (tabKey) => {
    if (onTabChange) onTabChange(tabKey);
    setMobileOpen(false);
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-white">
      <button
        type="button"
        className="border-b border-stone-200 p-5 text-left transition hover:bg-stone-50"
        onClick={() => handleNav('overview')}
        title="Go to Home"
      >
        <Logo size="sm" />
        <p className="mt-2 text-xs font-medium text-stone-400">{title}</p>
      </button>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {sidebarLinks.map((link) => {
          const tabKey = link.tab || 'overview';
          const isActive = onTabChange ? activeTab === tabKey : undefined;
          const className = `dm-sidebar-link w-full text-left ${isActive ? 'dm-sidebar-link-active' : ''}`;

          if (onTabChange) {
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => handleNav(tabKey)}
                className={className}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{link.label}</span>
                {link.badge > 0 && (
                  <span className="ml-auto rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold text-white">{link.badge}</span>
                )}
              </button>
            );
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive: navActive }) => `dm-sidebar-link ${navActive ? 'dm-sidebar-link-active' : ''}`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {link.badge > 0 && (
                <span className="ml-auto rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold text-white">{link.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-stone-200 p-4">
        <div className="mb-3 rounded-xl bg-stone-50 p-3">
          <p className="truncate text-sm font-semibold text-stone-900">{user?.name}</p>
          {user?.loginId && <p className="truncate font-mono text-xs font-semibold text-gold-dark">{user.loginId}</p>}
          <p className="truncate text-xs text-stone-400">{user?.email}</p>
        </div>
        <button type="button" onClick={handleLogout} className="dm-btn-ghost w-full text-sm text-red-600">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen dm-dashboard-bg">
      <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 shadow-2xl">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button type="button" className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
            {mobileOpen ? <X /> : <Menu />}
          </button>
          <h1 className="font-display text-lg font-bold text-stone-900 lg:text-xl">{title}</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            {headerActions}
            {(notificationItems != null || badge > 0) && (
              <NotificationBell
                count={badge || 0}
                items={notificationItems || []}
                onItemClick={onNotificationClick}
                onMarkAll={onNotificationMarkAll}
              />
            )}
            <span className="hidden text-sm text-stone-400 xl:block">Dream Mantra CRM</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
