import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TransactionForm from '@/components/TransactionForm';
import { LayoutDashboard, PlusCircle, List, Shield, LogOut, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/history', label: 'History', icon: List },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, isAdmin, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const createMut = useCreateTransaction();

  const handleAdd = (data: any) => {
    createMut.mutate(data, {
      onSuccess: () => { toast.success('Transaction added!'); setShowAddModal(false); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold text-lg">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            ExpenseTracker
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate('/auth'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card z-50 px-2 py-1">
        <div className="flex justify-around">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors',
                location.pathname === item.to ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 text-xs text-muted-foreground transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            Add
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors',
                location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Shield className="w-5 h-5" />
              Admin
            </Link>
          )}
        </div>
      </nav>
      <main className="flex-1 container px-4 py-6 pb-20 md:pb-6 animate-fade-in">
        {children}
      </main>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm onSubmit={handleAdd} loading={createMut.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
