import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddEntryForm from '@/components/AddEntryForm';
import { LayoutDashboard, PlusCircle, List, Shield, LogOut, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/history', label: 'History', icon: List },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, isAdmin, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden">
      <header className="border-b bg-card sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)]">
        <div className="container flex min-h-14 items-center justify-between gap-2 py-2 sm:h-14 sm:py-0">
          <Link to="/" className="flex min-w-0 items-center gap-2 font-heading font-bold text-base sm:text-lg">
            <div className="w-8 h-8 shrink-0 bg-primary rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="truncate">My Wallet</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.to
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <PlusCircle className="w-4 h-4" />
              Add Transaction
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname.startsWith('/admin')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground sm:inline md:max-w-[240px]">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="touch-manipulation shrink-0"
              onClick={() => { signOut(); navigate('/auth'); }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      {/* Mobile nav — below dialogs (z-[100]) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-1"
        aria-label="Primary"
      >
        <div className="flex justify-around">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex min-w-0 flex-1 max-w-[5.5rem] flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium leading-tight transition-colors touch-manipulation sm:px-2 sm:text-xs',
                location.pathname === item.to ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" aria-hidden />
              <span className="truncate w-full text-center">{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex min-w-0 flex-1 max-w-[5.5rem] flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium leading-tight text-muted-foreground transition-colors touch-manipulation sm:px-2 sm:text-xs"
          >
            <PlusCircle className="w-5 h-5 shrink-0" aria-hidden />
            <span>Add</span>
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                'flex min-w-0 flex-1 max-w-[5.5rem] flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium leading-tight transition-colors touch-manipulation sm:px-2 sm:text-xs',
                location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Shield className="w-5 h-5 shrink-0" aria-hidden />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </nav>
      <main className="flex-1 container w-full py-4 sm:py-6 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-6 animate-fade-in min-w-0">
        {children}
      </main>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add</DialogTitle>
          </DialogHeader>
          <AddEntryForm onDone={() => setShowAddModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
