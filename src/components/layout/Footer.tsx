import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto pb-16 lg:pb-0">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-6">
          <div>
            <h3 className="font-bold text-lg mb-3">{t('footer.brandName')}</h3>
            <p className="text-sm opacity-80">
              {t('footer.brandDesc')}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">{t('footer.popularCategories')}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/category/electronics" className="hover:opacity-100">{t('footer.electronics')}</Link></li>
              <li><Link to="/category/vehicles" className="hover:opacity-100">{t('footer.vehicles')}</Link></li>
              <li><Link to="/category/property" className="hover:opacity-100">{t('footer.property')}</Link></li>
              <li><Link to="/category/jobs" className="hover:opacity-100">{t('footer.jobs')}</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/auth" className="hover:opacity-100">{t('footer.loginRegister')}</Link></li>
              <li><Link to="/post-ad" className="hover:opacity-100">{t('footer.postAnAd')}</Link></li>
              <li><Link to="/my-ads" className="hover:opacity-100">{t('footer.myAds')}</Link></li>
              <li><Link to="/favorites" className="hover:opacity-100">{t('footer.favorites')}</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Membership &amp; Customer</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/membership-plans" className="hover:opacity-100">Membership Plans</Link></li>
              <li><Link to="/membership-benefits" className="hover:opacity-100">Membership Benefits</Link></li>
              <li><Link to="/billing" className="hover:opacity-100">Billing History</Link></li>
              <li><Link to="/my/addresses" className="hover:opacity-100">My Addresses</Link></li>
              <li><Link to="/my/offers" className="hover:opacity-100">My Offers</Link></li>
              <li><Link to="/my/support" className="hover:opacity-100">Customer Support</Link></li>
              <li><Link to="/recently-viewed" className="hover:opacity-100">Recently Viewed</Link></li>
              <li><Link to="/price-alerts" className="hover:opacity-100">Price Alerts</Link></li>
              <li><Link to="/notification-preferences" className="hover:opacity-100">Notification Preferences</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">{t('footer.support')}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><span>{t('footer.helpFaq')}</span></li>
              <li><span>{t('footer.safetyTips')}</span></li>
              <li><span>{t('footer.contactUs')}</span></li>
              <li><span>{t('footer.termsOfService')}</span></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-secondary-foreground/20 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm opacity-80">
          <p>{t('footer.copyright', { year })}</p>
          <div className="flex items-center gap-2 rounded-full border border-secondary-foreground/20 px-3 py-1.5 text-xs">
            <Smartphone className="h-3.5 w-3.5" />
            {t('footer.androidApp')}
          </div>
        </div>
      </div>
    </footer>
  );
}
