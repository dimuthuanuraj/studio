
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCog, UserPlus } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2 text-2xl font-bold text-primary">
            {/* Logos removed as per user request */}
            <span>VoiceID Lanka</span>
          </Link>
        </div>
        <nav className="space-x-2">
          <Button variant="outline" asChild>
            <Link href="/register">
              <UserPlus className="mr-2 h-5 w-5" />
              Register
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">
              <UserCog className="mr-2 h-5 w-5" />
              Admin Panel
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
