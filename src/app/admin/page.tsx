
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { AdminDashboard } from '@/components/admin-dashboard';
import { AdminLoginForm } from '@/components/admin-login-form';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const ADMIN_LOGGED_IN_KEY = 'isAdminLoggedIn';

export default function AdminPage() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const storedLoginStatus = localStorage.getItem(ADMIN_LOGGED_IN_KEY);
    if (storedLoginStatus === 'true') {
      setIsAdminLoggedIn(true);
    }
    setIsLoading(false);
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem(ADMIN_LOGGED_IN_KEY, 'true');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading admin area...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {!isAdminLoggedIn ? (
          <div className="flex flex-col items-center justify-center">
            <AdminLoginForm onLoginSuccess={handleAdminLoginSuccess} />
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                  VoiceID Lanka - Admin Dashboard
                </h1>
                <Button variant="outline" onClick={handleAdminLogout} size="sm">
                  <LogOut className="mr-2 h-4 w-4" /> Logout Admin
                </Button>
              </div>
              <p className="mt-4 text-lg text-muted-foreground">
                Oversee and manage all user audio submissions for speaker verification.
              </p>
            </div>
            <AdminDashboard />
          </>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t bg-card">
        © {currentYear} LankaVoiceID University of Jaffna. {isAdminLoggedIn ? 'Admin Panel.' : 'Secure Access.'}
      </footer>
    </div>
  );
}

