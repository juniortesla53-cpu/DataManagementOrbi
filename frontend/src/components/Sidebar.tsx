import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, FileBarChart, Users, Shield, BarChart3, LogOut, ChevronLeft, ChevronRight, Calculator, Target, Settings2, Play, ListChecks, Database, Combine } from 'lucide-react';
import NexusLogo from './NexusLogo';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const loc = useLocation();

  const mainItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  const adminItems = isAdmin ? [
    { to: '/admin/users', icon: Users, label: 'Usuários' },
    { to: '/admin/reports', icon: FileBarChart, label: 'Relatórios' },
    { to: '/admin/permissions', icon: Shield, label: 'Permissões' },
    { to: '/admin/powerbi', icon: BarChart3, label: 'Power BI' },
  ] : [];

  const rvItems = isAdmin ? [
    { to: '/rv', icon: Calculator, label: 'RV Dashboard' },
    { to: '/rv/fontes-config', icon: Database, label: 'Fontes de Dados' },
    { to: '/rv/indicadores-personalizados', icon: Combine, label: 'Indicadores Personalizados' },
    { to: '/rv/calcular', icon: Play, label: 'Plano de Cálculo' },
  ] : [];

  const isActive = (path: string) => loc.pathname === path;

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all relative ${
        isActive(to)
          ? 'bg-white/10 text-white font-semibold'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      {isActive(to) && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full gradient-brand" />
      )}
      <Icon size={18} className={collapsed ? 'mx-auto' : ''} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  return (
    <aside className={`${collapsed ? 'w-[60px]' : 'w-60'} h-screen bg-nexus-sidebar flex flex-col transition-all duration-300 flex-shrink-0`}>
      {/* Logo */}
      <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <NexusLogo size={32} />
            <span className="text-white font-bold text-lg tracking-tight">Nexus BI</span>
          </div>
        )}
        {collapsed && (
          <NexusLogo size={32} />
        )}
      </div>

      {/* Toggle */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          {!collapsed && <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">Menu</p>}
          {mainItems.map(item => <NavItem key={item.to} {...item} />)}
        </div>
        {adminItems.length > 0 && (
          <div className="space-y-1">
            {!collapsed && <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">Admin</p>}
            {adminItems.map(item => <NavItem key={item.to} {...item} />)}
          </div>
        )}
        {rvItems.length > 0 && (
          <div className="space-y-1">
            {!collapsed && <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">Nexus RV</p>}
            {rvItems.map(item => <NavItem key={item.to} {...item} />)}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-glow">
            {user?.nome?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
                <p className="text-[10px] text-white/40">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
              <button onClick={logout} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-all" title="Sair">
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
