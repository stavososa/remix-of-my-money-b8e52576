import { useState } from 'react';
import logoImg from '@/assets/logo-atacadao-maromba.png';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PeriodFilter } from '@/components/PeriodFilter';
import { Trophy, User, BarChart3, FileText, Download, LogOut, Menu, X } from 'lucide-react';
import { CustomBadge } from '@/components/StatusBadge';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: ('admin' | 'vendedor')[];
}

const navItems: NavItem[] = [
  { label: 'Ranking', to: '/ranking', icon: Trophy, roles: ['admin', 'vendedor'] },
  { label: 'Meu Painel', to: '/meu-painel', icon: User, roles: ['admin', 'vendedor'] },
  { label: 'Gerencial', to: '/gerencial', icon: BarChart3, roles: ['admin'] },
];


const adminItems: NavItem[] = [
{ label: 'Regras de Comissão', to: '/admin/regras', icon: FileText, roles: ['admin'] },
{ label: 'Importar Dados', to: '/admin/importar', icon: Download, roles: ['admin'] }];


export function AppShell({ children, title }: {children: React.ReactNode;title: string;}) {
  const { role, nome_completo, user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter((i) => role && i.roles.includes(role));
  const filteredAdmin = adminItems.filter((i) => role && i.roles.includes(role));

  const initials = (nome_completo || user?.email || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const SidebarContent = () =>
  <>
      <div className="p-5">
        <img src={logoImg} alt="Atacadão Maromba" className="h-10 w-auto" />
        <div className="mt-3 h-px bg-primary/30" />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {filteredNav.map((navItem) => (
          <NavLink
            key={navItem.to}
            to={navItem.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-foreground border-l-2 border-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              }`
            }
          >
            <navItem.icon className="h-4 w-4" />
            {navItem.label}
          </NavLink>
        ))}

        {filteredAdmin.length > 0 &&
      <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Administração</span>
            </div>
            {filteredAdmin.map((item) =>
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
          isActive ?
          'bg-sidebar-accent text-foreground border-l-2 border-primary' :
          'text-sidebar-foreground hover:bg-sidebar-accent/50'}`

          }>

                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
        )}
          </>
      }
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground truncate">{nome_completo || user?.email}</p>
          <CustomBadge text={role === 'admin' ? 'Admin' : 'Vendedor'} variant={role === 'admin' ? 'gold' : 'silver'} />
        </div>
        <button
        onClick={signOut}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors">

          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>;


  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-sidebar border-r border-sidebar-border shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen &&
      <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      }

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-card border-b border-border shrink-0">
          <div className="flex items-center px-4 lg:px-6 h-14 lg:h-16 gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-base lg:text-lg font-bold text-foreground flex-1 truncate">{title}</h2>
            <div className="hidden sm:block"><PeriodFilter /></div>
            <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-full bg-primary flex items-center justify-center text-xs lg:text-sm font-bold text-primary-foreground shrink-0">
              {initials}
            </div>
          </div>
          <div className="sm:hidden overflow-x-auto px-3 pb-2 -webkit-overflow-scrolling-touch">
            <PeriodFilter />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>);

}