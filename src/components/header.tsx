
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCog, UserPlus, LogIn } from 'lucide-react'; // Added UserPlus for Register

export function Header() {
  return (
    <header className="bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary">
          VoiceID Lanka
        </Link>
        <nav className="space-x-2">
          {/* Example: Add more navigation links here if needed */}
          {/* <Button variant="ghost" asChild>
            <Link href="/features">Features</Link>
          </Button> */}
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
          {/* Example Login Button - uncomment and implement if auth is added
          <Button variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <LogIn className="mr-2 h-5 w-5" />
            Login
          </Button>
          */}
        </nav>
      </div>
    </header>
  );
}
