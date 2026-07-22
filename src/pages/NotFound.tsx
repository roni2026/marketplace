import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Home, Search, LifeBuoy, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16 pb-24 lg:pb-16">
        <div className="text-center max-w-md">
          <p className="text-sm font-medium text-muted-foreground mb-2">Error 404</p>
          <h1 className="text-3xl font-semibold tracking-tight mb-3">This page doesn’t exist</h1>
          <p className="text-muted-foreground mb-2 leading-relaxed">
            We couldn’t find <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{location.pathname}</span>.
            It may have moved, or the link is out of date.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-8">
            <Button asChild>
              <Link to="/"><Home className="h-4 w-4 mr-2" /> Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/search"><Search className="h-4 w-4 mr-2" /> Search</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/help"><LifeBuoy className="h-4 w-4 mr-2" /> Help</Link>
            </Button>
          </div>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mt-6 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Go back
          </button>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
};

export default NotFound;
