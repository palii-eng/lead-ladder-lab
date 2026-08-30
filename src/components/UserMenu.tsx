import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Shield, User } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, profile, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const initial = (profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {initial}
          </div>
          <span className="hidden sm:inline text-sm">{profile?.full_name || profile?.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <User className="w-3 h-3 inline mr-1" />
          {profile?.email}
        </div>
        <DropdownMenuSeparator />
        {isStaff && (
          <DropdownMenuItem onClick={() => navigate('/admin')}>
            <Shield className="w-4 h-4 mr-2" /> Адмін-панель
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="w-4 h-4 mr-2" /> Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
