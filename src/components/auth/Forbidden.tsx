import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 403 Forbidden — shown when an authenticated admin tries to open a page
 * (by URL or nav) they are not authorized for. Access is enforced here on the
 * frontend AND independently on the backend (RLS + SECURITY DEFINER RPCs).
 */
export function Forbidden({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">403 — Forbidden</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {message ||
          'You do not have permission to access this page. If you believe this is a mistake, ask a Super Admin to grant you access.'}
      </p>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="outline" asChild>
          <Link to="/admin">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default Forbidden;
