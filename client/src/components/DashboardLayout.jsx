import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, LayoutDashboard, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../config/roleNavigation';
import Logo from './Logo';
import NotificationBell from './NotificationBell';

const MOBILE_PRIMARY = ['overview', 'leads', 'partners', 'students', 'messages'];

export default function DashboardLayout({
  sidebarLinks, children, title, badge, headerActions, activeTab, onTabChange,
  notificationItems, onNotificationClick, onNotificationMarkAll,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath = getDashboardPath(user?.role) || '/admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNav = (tabKey) => {
    if (onTabChange) onTabChange(tabKey);
    setMobileOpen(false);
  };

  const goDashboard = () => {
    if (onTabChange) onTabChange('overview');
    else navigate(dashboardPath);
    setMobileOpen(false);
  };

  const primaryMobile = useMemo(() => {
    const byTab = new Map(sidebarLinks.map((l) => [l.tab || 'overview', l]));
    const picks = MOBILE_PRIMARY.map((t) => byTab.get(t)).filter(Boolean);
    if (picks.length >= 4) return picks.slice(0, 4);
    return sidebarLinks.slice(0, 4);
  }, [sidebarLinks]);

  const moreActive = onTabChange
    && activeTab
    && !primaryMobile.some((l) => (l.tab || 'overview') === activeTab);

  const NavItems = ({ compact = false }) => (
    <>
      {sidebarLinks.map((link) => {
        const tabKey = link.tab || 'overview';
        const isActive = onTabChange ? activeTab === tabKey : undefined;
        const className = `dm-sidebar-link w-full text-left ${isActive ? 'dm-sidebar-link-active' : ''} ${compact ? 'min-h-11 touch-manipulation' : ''}`;

        if (onTabChange) {
          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => handleNav(tabKey)}
              className={className}
            >
              <link.icon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
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
            className={({ isActive: navActive }) => `dm-sidebar-link min-h-11 touch-manipulation ${navActive ? 'dm-sidebar-link-active' : ''}`}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
            {link.badge > 0 && (
              <span className="ml-auto rounded-full bg-orange px-2 py-0.5 text-[10px] font-bold text-white">{link.badge}</span>
            )}
          </NavLink>
        );
      })}
    </>
  );

  const Sidebar = ({ showBrand = true }) => (
    <div className="flex h-full flex-col bg-white">
      {showBrand && (
        <div className="border-b border-stone-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <Logo size="md" to="/" />
            <button
              type="button"
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-xs font-medium text-stone-400 lg:hidden">{title}</p>
        </div>
      )}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
        <NavItems compact />
      </nav>
      <div className="border-t border-stone-200 p-4">
        <div className="mb-3 rounded-xl bg-stone-50 p-3">
          <p className="truncate text-sm font-semibold text-stone-900">{user?.name}</p>
          {user?.loginId && <p className="truncate font-mono text-xs font-semibold text-gold-dark">{user.loginId}</p>}
          <p className="truncate text-xs text-stone-400">{user?.email}</p>
        </div>
        <button type="button" onClick={handleLogout} className="dm-btn-ghost w-full min-h-11 text-sm text-red-600">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen dm-dashboard-bg">
      <aside className="hidden w-72 shrink-0 border-r border-stone-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 h-full w-[min(100%,20rem)] max-w-full shadow-2xl">
            <Sidebar showBrand={false} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 lg:px-8 lg:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="shrink-0 rounded-lg p-2.5 text-stone-600 hover:bg-stone-100 lg:hidden touch-manipulation"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Open menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0 shrink-0 lg:hidden">
                <Logo size="sm" to="/" />
              </div>
              <h1 className="truncate font-display text-base font-bold text-stone-900 sm:text-lg lg:text-xl">{title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className="hidden items-center gap-2 sm:flex [&_.dm-btn-primary]:min-h-9 [&_.dm-btn-primary]:px-2.5 [&_.dm-btn-primary]:text-[11px] sm:[&_.dm-btn-primary]:text-xs">
                {headerActions}
              </div>
              {(notificationItems != null || badge > 0) && (
                <NotificationBell
                  count={badge || 0}
                  items={notificationItems || []}
                  onItemClick={onNotificationClick}
                  onMarkAll={onNotificationMarkAll}
                />
              )}
              <button
                type="button"
                onClick={goDashboard}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-gold/15 hover:text-gold-dark touch-manipulation sm:px-3"
                title="Go to Dashboard"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            </div>
          </div>
          {/* Mobile: quick action row when headerActions exist */}
          {headerActions && (
            <div className="flex items-center gap-2 overflow-x-auto border-t border-stone-100 px-3 py-2 sm:hidden">
              {headerActions}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto p-3 pb-24 sm:p-4 lg:p-8 lg:pb-8">{children}</main>

        {/* Mobile bottom nav — primary tabs + More */}
        {onTabChange && (
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
            <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-1">
              {primaryMobile.map((link) => {
                const tabKey = link.tab || 'overview';
                const isActive = activeTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => handleNav(tabKey)}
                    className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold touch-manipulation ${
                      isActive ? 'bg-orange/15 text-orange' : 'text-stone-500'
                    }`}
                  >
                    <link.icon className="h-5 w-5" />
                    <span className="max-w-full truncate">{link.label}</span>
                    {link.badge > 0 && (
                      <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange" />
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold touch-manipulation ${
                  moreActive || mobileOpen ? 'bg-orange/15 text-orange' : 'text-stone-500'
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
                <span>More</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
