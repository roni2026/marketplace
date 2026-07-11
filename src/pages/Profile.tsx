import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, User, BadgeCheck, Shield, Monitor, Trash2, AlertTriangle } from 'lucide-react';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { logAudit } from '@/lib/audit';
import { useTranslation } from 'react-i18next';

interface Profile {
  full_name: string | null;
  phone_number: string | null;
  division: string | null;
  district: string | null;
  area: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

interface Session {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean | null;
  last_activity_at: string;
  created_at: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, profileCompletion, refreshProfile } = useAuth();
  const { t } = useTranslation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    phone_number: '',
    division: '',
    district: '',
    area: '',
    avatar_url: null,
    is_verified: false,
  });
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSessions();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setProfile({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        division: data.division || '',
        district: data.district || '',
        area: data.area || '',
        avatar_url: data.avatar_url,
        is_verified: data.is_verified,
      });
    }
    setIsLoading(false);
  };

  const fetchSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setSessions((data as Session[]) || []);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const fileName = `${user.id}/${Date.now()}-avatar`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast.success(t('toast.avatarUploaded'));
    } catch (error) {
      toast.error(t('toast.avatarUploadFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        division: profile.division,
        district: profile.district,
        area: profile.area,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setIsSaving(false);

    if (error) {
      toast.error(t('toast.profileUpdateFailed'));
    } else {
      toast.success(t('toast.profileUpdated'));
      refreshProfile();
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error(t('toast.accountDeleteFailed'));
    } else {
      await logAudit({ action: 'delete', resourceType: 'user', resourceId: user.id });
      toast.success(t('toast.accountDeleted'));
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
    fetchSessions();
    toast.success(t('toast.sessionRevoked'));
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Profile Completion */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{t('profile.profileCompletion')}</h3>
                <span className="text-2xl font-bold text-primary">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {profileCompletion < 100 
                  ? t('profile.completeProfile')
                  : t('profile.profileComplete')}
              </p>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {profile.is_verified ? (
                  <BadgeCheck className="h-8 w-8 text-primary" />
                ) : (
                  <Shield className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold">
                    {profile.is_verified ? t('profile.verifiedAccount') : t('profile.notVerified')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile.is_verified 
                      ? t('profile.verifiedDesc')
                      : t('profile.notVerifiedDesc')}
                  </p>
                </div>
              </div>
              {!profile.is_verified && (
                <Badge variant="secondary">{t('profile.pending')}</Badge>
              )}
            </CardContent>
          </Card>

          {/* Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.myProfile')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Upload className="h-4 w-4" />
                        {t('profile.uploadPhoto')}
                      </div>
                    </Label>
                    <input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t('profile.fullName')}</Label>
                  <Input
                    id="name"
                    value={profile.full_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder={t('profile.namePlaceholder')}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('profile.phoneNumber')}</Label>
                  <Input
                    id="phone"
                    value={profile.phone_number || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder={t('profile.phonePlaceholder')}
                  />
                </div>

                {/* Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('profile.division')}</Label>
                    <Select
                      value={profile.division || ''}
                      onValueChange={(v) => setProfile(prev => ({ ...prev, division: v, district: '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('profile.selectDivision')} />
                      </SelectTrigger>
                      <SelectContent>
                        {DIVISIONS.map((div) => (
                          <SelectItem key={div} value={div}>{div}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('profile.district')}</Label>
                    <Select
                      value={profile.district || ''}
                      onValueChange={(v) => setProfile(prev => ({ ...prev, district: v }))}
                      disabled={!profile.division}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('profile.selectDistrict')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(DISTRICTS[profile.division || ''] || []).map((dist) => (
                          <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">{t('profile.area')}</Label>
                  <Input
                    id="area"
                    value={profile.area || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, area: e.target.value }))}
                    placeholder={t('profile.areaPlaceholder')}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('profile.saveChanges')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Device Management / Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-5 w-5" />
                {t('profile.activeSessions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('profile.noSessions')}</p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.user_agent || t('profile.unknownDevice')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.ip_address || t('profile.unknownIP')} · {t('profile.active')} {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                      </p>
                    </div>
                    {session.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('profile.dangerZone')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{t('profile.deleteAccount')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('profile.deleteAccountDesc')}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/50">
                      {t('profile.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('profile.deleteAccountConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('profile.deleteAccountWarning')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground">
                        {t('profile.deleteAccountButton')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
