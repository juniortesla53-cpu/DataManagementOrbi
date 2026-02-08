import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, FileBarChart, Users, Shield, Settings, LogOut, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const loc = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ...(isAdmin ? [
      { to: '/admin/users', icon: Users, label: 'Usuários' },
      { to: '/admin/reports', icon: FileBarChart, label: 'Relatórios' },
      { to: '/admin/permissions', icon: Shield, label: 'Permissões' },
    ] : []),
  ];

  const isActive = (path: string) => loc.pathname === path;

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} h-screen bg-orbi-nav border-r border-slate-700/50 flex flex-col transition-all duration-300 flex-shrink-0`}>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-slate-700/50">
        {!collapsed && <span className="text-lg font-bold text-orbi-accent tracking-wide">⬡ Orbi</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded hover:bg-slate-700/50 text-orbi-muted">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(item.to) ? 'bg-orbi-accent/20 text-orbi-accent' : 'text-orbi-muted hover:text-orbi-text hover:bg-slate-700/30'}`}>
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-700/50">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-full bg-orbi-accent/30 flex items-center justify-center text-orbi-accent text-xs font-bold flex-shrink-0">
            {user?.nome?.charAt(0) || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.nome}</p>
              <p className="text-[10px] text-orbi-muted truncate">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="p-1.5 rounded hover:bg-slate-700/50 text-orbi-muted hover:text-orbi-danger" title="Sair">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
