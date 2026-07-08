import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto pb-16 lg:pb-0">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">BazarBD</h3>
            <p className="text-sm opacity-80">
              Bangladesh's trusted marketplace for buying and selling anything. 
              From electronics to property, find it all here.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Popular Categories</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/category/electronics" className="hover:opacity-100">Electronics</Link></li>
              <li><Link to="/category/vehicles" className="hover:opacity-100">Vehicles</Link></li>
              <li><Link to="/category/property" className="hover:opacity-100">Property</Link></li>
              <li><Link to="/category/jobs" className="hover:opacity-100">Jobs</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/auth" className="hover:opacity-100">Login / Register</Link></li>
              <li><Link to="/post-ad" className="hover:opacity-100">Post an Ad</Link></li>
              <li><Link to="/my-ads" className="hover:opacity-100">My Ads</Link></li>
              <li><Link to="/favorites" className="hover:opacity-100">Favorites</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><span>Help & FAQ</span></li>
              <li><span>Safety Tips</span></li>
              <li><span>Contact Us</span></li>
              <li><span>Terms of Service</span></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-secondary-foreground/20 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm opacity-80">
          <p>© {year} BazarBD. All rights reserved. Made with ❤️ in Bangladesh</p>
          <div className="flex items-center gap-2 rounded-full border border-secondary-foreground/20 px-3 py-1.5 text-xs">
            <Smartphone className="h-3.5 w-3.5" />
            Also available as an Android app
          </div>
        </div>
      </div>
    </footer>
  );
}
