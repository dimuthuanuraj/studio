import { Header } from '@/components/header';
import { AdminDashboard } from '@/components/admin-dashboard';

export default function AdminPage() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            VoiceID Lanka - Admin Dashboard
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Oversee and manage all user audio submissions for speaker verification.
          </p>
        </div>
        <AdminDashboard />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t bg-card">
        © {new Date().getFullYear()} VoiceID Lanka. Admin Panel.
      </footer>
    </div>
  );
}
