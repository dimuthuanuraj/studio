
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { UserCog, UserPlus } from 'lucide-react';
import UojLogo from '@/img/UoJ_logo_optimized.png';
import MlslpLogo from '@/img/MLSP_lab_logo_optimized.png';

export function Header() {
  return (
    <header className="bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3 text-2xl font-bold text-primary">
            <Image 
              src={UojLogo}
              alt="University of Jaffna Logo" 
              width={40} 
              height={40} 
              className="rounded-full"
              data-ai-hint="university emblem" 
            />
            <Image
              src={MlslpLogo}
              alt="MLSP Lab Logo"
              width={120} // Increased width
              height={23} // Increased height, maintaining aspect ratio (original 960x180 -> 120x22.5, rounded to 23)
              data-ai-hint="lab emblem"
            />
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

