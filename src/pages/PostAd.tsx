import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, ImageIcon, ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { DIVISIONS, DISTRICTS, generateSlug } from '@/lib/constants';
import { validateTitle, validateDescription, validatePrice, validateLocation, validateImageFile, sanitizeText, sanitizeRichText } from '@/lib/validation';
import { moderateContent, getSpamScore } from '@/lib/moderation';
import { logAdAction } from '@/lib/audit';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

export default function PostAd() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable' | 'free'>('fixed');
  const [condition, setCondition] = useState<'new' | 'used'>('used');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categoryId) {
      setFilteredSubcategories(subcategories.filter(s => s.category_id === categoryId));
      setSubcategoryId('');
    }
  }, [categoryId, subcategories]);

  const fetchCategories = async () => {
    const [catRes, subRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*'),
    ]);
    
    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data);
  };

  const addFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    if (images.length + imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Validate each image file
    for (const file of imageFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.errors[0]);
        return;
      }
    }

    const newImages = [...images, ...imageFiles].slice(0, 5);
    setImages(newImages);

    const newPreviews = newImages.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files || []));
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    [newImages[index], newImages[target]] = [newImages[target], newImages[index]];
    [newPreviews[index], newPreviews[target]] = [newPreviews[target], newPreviews[index]];
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const uploadImages = async (adId: string) => {
    const uploadedUrls: string[] = [];
    
    for (const image of images) {
      const fileName = `${adId}/${Date.now()}-${image.name}`;
      const { data, error } = await supabase.storage
        .from('ad-images')
        .upload(fileName, image);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('ad-images')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(urlData.publicUrl);
    }
    
    return uploadedUrls;
  };

  const checkDuplicate = async (titleText: string, descText: string) => {
    const { data } = await supabase
      .from('ads')
      .select('title, description')
      .eq('user_id', user!.id)
      .limit(20);

    if (!data || data.length === 0) return false;

    const newWords = new Set((titleText + ' ' + descText).toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w: string) => w.length > 2));
    for (const existing of data) {
      const existingWords = new Set((existing.title + ' ' + (existing.description || '')).toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w: string) => w.length > 2));
      const intersection = new Set([...newWords].filter((x: string) => existingWords.has(x)));
      const union = new Set([...newWords, ...existingWords]);
      if (union.size > 0 && intersection.size / union.size >= 0.7) {
        return true;
      }
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to post an ad');
      return;
    }

    // Validate inputs
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      toast.error(titleValidation.errors[0]);
      return;
    }

    const descValidation = validateDescription(description);
    if (!descValidation.valid) {
      toast.error(descValidation.errors[0]);
      return;
    }

    const priceValidation = validatePrice(price, priceType);
    if (!priceValidation.valid) {
      toast.error(priceValidation.errors[0]);
      return;
    }

    const locationValidation = validateLocation(division, district);
    if (!locationValidation.valid) {
      toast.error(locationValidation.errors[0]);
      return;
    }

    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }

    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    // Moderate content
    const moderationResult = moderateContent(title + ' ' + description);
    if (moderationResult.flags.length > 0) {
      if (moderationResult.flags.some(f => f.startsWith('profanity:'))) {
        toast.error('Your ad contains inappropriate language. Please revise.');
        return;
      }
    }

    // Check spam score
    const spamScore = getSpamScore(title + ' ' + description);
    if (spamScore >= 60) {
      toast.error('Your ad content appears to be spam. Please revise.');
      return;
    }

    // Check for duplicates
    const isDuplicate = await checkDuplicate(title, description);
    if (isDuplicate) {
      toast.error('You already have a very similar ad. Please modify your listing.');
      return;
    }

    setIsLoading(true);
    
    try {
      const sanitizedTitle = sanitizeText(title);
      const sanitizedDesc = sanitizeRichText(description);
      const slug = generateSlug(sanitizedTitle);
      const priceValue = priceType === 'free' ? null : parseFloat(price) || null;
      const scheduledAt = scheduleDate ? new Date(scheduleDate).toISOString() : null;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: ad, error: adError } = await supabase
        .from('ads')
        .insert({
          user_id: user.id,
          title: sanitizedTitle,
          slug,
          description: sanitizedDesc,
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          price: priceValue,
          price_type: priceType,
          condition,
          division,
          district,
          area: sanitizeText(area),
          is_urgent: isUrgent,
          scheduled_at: scheduledAt,
          expires_at: expiresAt,
          status: scheduledAt ? 'draft' : 'pending',
        })
        .select()
        .single();

      if (adError) throw adError;

      const imageUrls = await uploadImages(ad.id);
      
      const imageInserts = imageUrls.map((url, index) => ({
        ad_id: ad.id,
        image_url: url,
        sort_order: index,
      }));
      
      await supabase.from('ad_images').insert(imageInserts);

      // Log audit
      await logAdAction('create', ad.id, { title: sanitizedTitle, spam_score: spamScore });

      toast.success(scheduleDate 
        ? 'Ad scheduled successfully! It will be published on the selected date.'
        : 'Ad posted successfully! It will be visible after admin approval.');
      navigate('/my-ads');
    } catch (error: any) {
      console.error('Error posting ad:', error);
      toast.error(error.message || 'Failed to post ad');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Post an Ad</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Images */}
              <div className="space-y-2">
                <Label>Images (max 5) *</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          className="bg-card/90 rounded p-1 disabled:opacity-30"
                          aria-label="Move image earlier"
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === imagePreviews.length - 1}
                          onClick={() => moveImage(index, 1)}
                          className="bg-card/90 rounded p-1 disabled:opacity-30"
                          aria-label="Move image later"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <label
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
                      }`}
                    >
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1 text-center px-1">
                        {isDragging ? 'Drop here' : 'Add or drag'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  The first photo is used as the cover image. Use the arrows to reorder. Max 5MB per image.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you selling?"
                  maxLength={100}
                  required
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {title.trim() ? (
                    <span className="truncate">URL preview: /ad/{generateSlug(title)}-…</span>
                  ) : <span />}
                  <span>{title.length}/100</span>
                </div>
              </div>

              {/* Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-4">
                <Label>Price Type</Label>
                <RadioGroup
                  value={priceType}
                  onValueChange={(v) => setPriceType(v as typeof priceType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">Fixed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="negotiable" id="negotiable" />
                    <Label htmlFor="negotiable">Negotiable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="free" id="free" />
                    <Label htmlFor="free">Free</Label>
                  </div>
                </RadioGroup>
                
                {priceType !== 'free' && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (৳)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                      min={0}
                    />
                  </div>
                )}
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <Label>Condition</Label>
                <RadioGroup
                  value={condition}
                  onValueChange={(v) => setCondition(v as typeof condition)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new">New</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="used" id="used" />
                    <Label htmlFor="used">Used</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your item in detail..."
                  rows={5}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">{description.length}/5000</p>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Division *</Label>
                  <Select value={division} onValueChange={(v) => { setDivision(v); setDistrict(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIVISIONS.map((div) => (
                        <SelectItem key={div} value={div}>
                          {div}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>District *</Label>
                  <Select value={district} onValueChange={setDistrict} disabled={!division}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {(DISTRICTS[division] || []).map((dist) => (
                        <SelectItem key={dist} value={dist}>
                          {dist}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area (Optional)</Label>
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g., Gulshan, Mirpur..."
                />
              </div>

              {/* Scheduling & Urgent */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule" className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Schedule (Optional)
                  </Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground">Publish at a later date</p>
                </div>
                <div className="space-y-2">
                  <Label>Mark as Urgent</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="urgent"
                      checked={isUrgent}
                      onChange={(e) => setIsUrgent(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Label htmlFor="urgent" className="text-sm font-normal cursor-pointer">
                      Show urgent badge
                    </Label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {scheduleDate ? 'Schedule Ad' : 'Post Ad'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
