/**
 * PostAdV4 — Enhanced listing creation/editing wizard for Phase 4.
 * Multi-step wizard with all Phase 4 fields: basic info, product attributes,
 * condition details, pricing, media, shipping, warranty, and review.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { useListingManagement } from '@/hooks/useListingManagement';
import { supabase } from '@/integrations/supabase/client';
import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/cloudinary';
import { DIVISIONS, DISTRICTS, generateSlug, formatPrice } from '@/lib/constants';
import { validateTitle, validateDescription, validatePrice, validateImageFile, sanitizeText, sanitizeRichText } from '@/lib/validation';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, Upload, X, Star, ImageIcon, Calendar,
  Loader2, Save, Send, ChevronUp, ChevronDown, AlertCircle,
} from 'lucide-react';
import type {
  ListingType, ItemConditionConfig, CategoryAttribute,
  ShippingMethod, ShippingFeeType, WarrantyType, ConditionDetails,
} from '@/integrations/supabase/types_v4_listings';

interface Category { id: string; name: string; slug: string; }
interface Subcategory { id: string; name: string; category_id: string; }
interface ExistingImage { id: string; image_url: string; sort_order: number; }

const TOTAL_STEPS = 8;
const MAX_IMAGES = 10;
const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP'];

export default function PostAdV4() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { createListing, updateListing, fetchListingTypes, fetchItemConditions, fetchCategoryAttributes, validateListing } = useListingManagement();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Reference data
  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [itemConditions, setItemConditions] = useState<ItemConditionConfig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryAttrs, setCategoryAttrs] = useState<CategoryAttribute[]>([]);

  // Form state — Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [richDescription, setRichDescription] = useState('');
  const [listingType, setListingType] = useState('new');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [condition, setCondition] = useState('used');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [mpn, setMpn] = useState('');

  // Step 2: Product Attributes
  const [productAttributes, setProductAttributes] = useState<Record<string, unknown>>({});

  // Step 3: Condition Details
  const [conditionDetails, setConditionDetails] = useState<ConditionDetails>({});

  // Step 4: Pricing
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable' | 'free'>('fixed');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [minOffer, setMinOffer] = useState('');
  const [currency, setCurrency] = useState('BDT');

  // Step 5: Media
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 6: Shipping
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingFeeType, setShippingFeeType] = useState<ShippingFeeType>('free');
  const [shippingFee, setShippingFee] = useState('');
  const [freeShipping, setFreeShipping] = useState(true);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('');
  const [handlingTimeDays, setHandlingTimeDays] = useState('');
  const [deliveryLocations, setDeliveryLocations] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');

  // Step 7: Warranty
  const [warrantyType, setWarrantyType] = useState<WarrantyType>('none');
  const [warrantyDuration, setWarrantyDuration] = useState('');
  const [warrantyCoverage, setWarrantyCoverage] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('');

  // Step 8: Schedule
  const [scheduleDate, setScheduleDate] = useState('');

  // Load reference data
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    Promise.all([
      fetchListingTypes(),
      fetchItemConditions(),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*'),
    ]).then(([types, conds, catRes, subRes]) => {
      setListingTypes(types);
      setItemConditions(conds);
      setCategories((catRes.data as Category[]) || []);
      setSubcategories((subRes.data as Subcategory[]) || []);
    });
  }, [fetchListingTypes, fetchItemConditions]);

  // Load category attributes when category changes
  useEffect(() => {
    if (categoryId) {
      fetchCategoryAttributes(categoryId).then(setCategoryAttrs);
      setSubcategoryId('');
    }
  }, [categoryId, fetchCategoryAttributes]);

  // Load existing listing for edit mode
  useEffect(() => {
    if (editId && user) {
      supabase.from('ads').select('*').eq('id', editId).single().then(({ data }) => {
        if (data) {
          const ad = data as Record<string, unknown>;
          setTitle(ad.title as string || '');
          setShortDescription(ad.short_description as string || '');
          setRichDescription(ad.rich_description as string || '');
          setListingType(ad.listing_type as string || 'new');
          setBrand(ad.brand as string || '');
          setModel(ad.model as string || '');
          setCategoryId(ad.category_id as string || '');
          setSubcategoryId(ad.subcategory_id as string || '');
          setTags((ad.tags as string[] || []).join(', '));
          setCondition(ad.condition as string || 'used');
          setSku(ad.sku as string || '');
          setBarcode(ad.barcode as string || '');
          setSerialNumber(ad.serial_number as string || '');
          setMpn(ad.mpn as string || '');
          setProductAttributes(ad.product_attributes as Record<string, unknown> || {});
          setConditionDetails(ad.condition_details as ConditionDetails || {});
          setPrice(ad.price ? String(ad.price) : '');
          setOriginalPrice(ad.original_price ? String(ad.original_price) : '');
          setPriceType((ad.price_type as 'fixed' | 'negotiable' | 'free') || 'fixed');
          setIsNegotiable(ad.is_negotiable as boolean || false);
          setMinOffer(ad.min_offer ? String(ad.min_offer) : '');
          setCurrency(ad.currency as string || 'BDT');
          setShippingMethods((ad.shipping_methods as ShippingMethod[]) || []);
          setShippingFeeType((ad.shipping_fee_type as ShippingFeeType) || 'free');
          setShippingFee(ad.shipping_fee ? String(ad.shipping_fee) : '');
          setFreeShipping(ad.free_shipping as boolean ?? true);
          setEstimatedDeliveryDays(ad.estimated_delivery_days ? String(ad.estimated_delivery_days) : '');
          setHandlingTimeDays(ad.handling_time_days ? String(ad.handling_time_days) : '');
          setDeliveryLocations((ad.delivery_locations as string[] || []).join(', '));
          setDivision(ad.division as string || '');
          setDistrict(ad.district as string || '');
          setArea(ad.area as string || '');
          setWarrantyType((ad.warranty_type as WarrantyType) || 'none');
          setWarrantyDuration(ad.warranty_duration_months ? String(ad.warranty_duration_months) : '');
          setWarrantyCoverage(ad.warranty_coverage as string || '');
          setWarrantyTerms(ad.warranty_terms as string || '');
        }
      });
      // Load existing images
      supabase.from('ad_images').select('*').eq('ad_id', editId).order('sort_order').then(({ data }) => {
        if (data) setExistingImages(data as ExistingImage[]);
      });
    }
  }, [editId, user]);

  // Image handlers
  const addFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    if (images.length + imageFiles.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }
    for (const file of imageFiles) {
      const validation = validateImageFile(file);
      if (!validation.valid) { toast.error(validation.errors[0]); return; }
    }
    const newImages = [...images, ...imageFiles].slice(0, MAX_IMAGES);
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
    if (coverImageIndex === index) setCoverImageIndex(0);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    const newImages = [...images];
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
  };

  // Discount calculation
  const priceNum = parseFloat(price) || 0;
  const originalNum = parseFloat(originalPrice) || 0;
  const discountAmount = originalNum > 0 && priceNum < originalNum ? originalNum - priceNum : 0;
  const discountPercentage = originalNum > 0 && discountAmount > 0 ? Math.round((discountAmount / originalNum) * 100) : 0;

  // Shipping method toggle
  const toggleShippingMethod = (method: ShippingMethod) => {
    setShippingMethods(prev => prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]);
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    setValidationErrors([]);
    const errors: string[] = [];
    switch (step) {
      case 1:
        if (!title || title.trim().length < 3) errors.push('Title must be at least 3 characters');
        if (title.length > 100) errors.push('Title must be less than 100 characters');
        if (!categoryId) errors.push('Category is required');
        if (!condition) errors.push('Condition is required');
        break;
      case 2:
        for (const attr of categoryAttrs) {
          if (attr.is_required && (!productAttributes[attr.slug] || String(productAttributes[attr.slug]).trim() === '')) {
            errors.push(`${attr.name} is required`);
          }
        }
        break;
      case 4:
        if (priceType !== 'free' && (!price || parseFloat(price) < 0)) errors.push('Valid price is required');
        break;
      case 6:
        if (!division) errors.push('Division is required');
        if (!district) errors.push('District is required');
        break;
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // Submit
  const buildListingData = () => {
    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    const locationsArray = deliveryLocations.split(',').map(l => l.trim()).filter(Boolean);
    return {
      title,
      description: richDescription || undefined,
      rich_description: richDescription || undefined,
      short_description: shortDescription || undefined,
      category_id: categoryId,
      subcategory_id: subcategoryId || null,
      price: priceType === 'free' ? null : parseFloat(price) || null,
      original_price: originalPrice ? parseFloat(originalPrice) : null,
      price_type: priceType,
      is_negotiable: isNegotiable || priceType === 'negotiable',
      min_offer: minOffer ? parseFloat(minOffer) : null,
      currency,
      condition,
      listing_type: listingType,
      brand: brand || undefined,
      model: model || undefined,
      tags: tagsArray,
      sku: sku || undefined,
      barcode: barcode || undefined,
      serial_number: serialNumber || undefined,
      mpn: mpn || undefined,
      product_attributes: productAttributes,
      condition_details: conditionDetails,
      division,
      district,
      area: area || undefined,
      shipping_methods: shippingMethods,
      shipping_fee_type: shippingFeeType,
      shipping_fee: shippingFee ? parseFloat(shippingFee) : 0,
      free_shipping: freeShipping,
      estimated_delivery_days: estimatedDeliveryDays ? parseInt(estimatedDeliveryDays) : undefined,
      handling_time_days: handlingTimeDays ? parseInt(handlingTimeDays) : undefined,
      delivery_locations: locationsArray,
      warranty_type: warrantyType,
      warranty_duration_months: warrantyDuration ? parseInt(warrantyDuration) : undefined,
      warranty_coverage: warrantyCoverage || undefined,
      warranty_terms: warrantyTerms || undefined,
      scheduled_at: scheduleDate ? new Date(scheduleDate).toISOString() : null,
    };
  };

  const uploadImages = async (adId: string) => {
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      let imageUrl = '';

      if (isCloudinaryConfigured()) {
        try {
          const up = await uploadToCloudinary(file, {
            folder: `bazarbd/ads/${adId}`,
            tags: ['ad', adId],
          });
          imageUrl = up.secure_url;
        } catch (err) {
          console.error('Cloudinary image upload error:', err);
        }
      }

      if (!imageUrl) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${adId}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('ad-images').upload(filePath, file);
        if (uploadError) { console.error('Image upload error:', uploadError); continue; }
        const { data: urlData } = supabase.storage.from('ad-images').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      await supabase.from('ad_images').insert({
        ad_id: adId,
        image_url: imageUrl,
        sort_order: i,
      });
    }
  };

  const handleSubmit = async (status: 'draft' | 'pending' | 'scheduled') => {
    if (!user) return;
    setIsSubmitting(true);
    const data = buildListingData();

    // Run validation
    const validation = await validateListing({
      title: data.title,
      description: data.rich_description || '',
      price: data.price ?? null,
      price_type: data.price_type,
      category_id: data.category_id,
      images: images.length > 0 ? images.map(() => ({ url: 'pending' })) : [],
      sku: data.sku,
      barcode: data.barcode,
      user_id: user.id,
      ad_id: editId || undefined,
    });

    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setIsSubmitting(false);
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      let result;
      if (editId) {
        result = await updateListing(editId, { ...data, status });
      } else {
        result = await createListing({ ...data, status });
      }

      if (result) {
        if (!editId && images.length > 0) {
          await uploadImages(result.id);
        } else if (editId && images.length > 0) {
          await uploadImages(editId);
        }
        toast.success(status === 'draft' ? 'Draft saved' : status === 'scheduled' ? 'Listing scheduled' : 'Listing published for review');
        navigate('/seller-listings');
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to save listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / TOTAL_STEPS) * 100;
  const filteredSubcats = subcategories.filter(s => s.category_id === categoryId);

  const stepLabels = ['Basic Info', 'Attributes', 'Condition', 'Pricing', 'Media', 'Shipping', 'Warranty', 'Review'];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{editId ? 'Edit Listing' : 'Create New Listing'}</h1>
          <p className="text-sm text-muted-foreground">Complete all steps to publish your listing</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {TOTAL_STEPS}: {stepLabels[currentStep - 1]}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="hidden md:flex justify-between mt-2">
            {stepLabels.map((label, i) => (
              <button
                key={label}
                onClick={() => i + 1 < currentStep && setCurrentStep(i + 1)}
                className={`text-xs ${i + 1 === currentStep ? 'font-bold text-foreground' : i + 1 < currentStep ? 'text-primary cursor-pointer' : 'text-muted-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-sm font-medium text-destructive">Please fix the following:</span></div>
            <ul className="text-sm text-destructive ml-6 list-disc">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. iPhone 14 Pro Max 256GB" maxLength={100} /></div>
                <div><Label>Short Description</Label><Input value={shortDescription} onChange={e => setShortDescription(e.target.value)} placeholder="Brief one-line summary" maxLength={200} /></div>
                <div><Label>Description</Label><Textarea value={richDescription} onChange={e => setRichDescription(e.target.value)} placeholder="Detailed description of your item" rows={5} maxLength={5000} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Listing Type</Label><Select value={listingType} onValueChange={setListingType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{listingTypes.map(t => <SelectItem key={t.id} value={t.slug}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Item Condition</Label><Select value={condition} onValueChange={setCondition}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{itemConditions.map(c => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Brand</Label><Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Apple" /></div>
                  <div><Label>Model</Label><Input value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. iPhone 14 Pro Max" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Category *</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Subcategory</Label><Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId}><SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger><SelectContent>{filteredSubcats.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><Label>Tags (comma-separated)</Label><Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. smartphone, apple, ios" /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div><Label>SKU</Label><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Optional" /></div>
                  <div><Label>Barcode</Label><Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Optional" /></div>
                  <div><Label>Serial Number</Label><Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Optional" /></div>
                  <div><Label>MPN</Label><Input value={mpn} onChange={e => setMpn(e.target.value)} placeholder="Optional" /></div>
                </div>
              </div>
            )}

            {/* Step 2: Product Attributes */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {categoryAttrs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No custom attributes for this category. You can proceed to the next step.</p>
                ) : (
                  categoryAttrs.map(attr => (
                    <div key={attr.id}>
                      <Label>{attr.name} {attr.is_required && <span className="text-destructive">*</span>}</Label>
                      {attr.data_type === 'text' && <Input value={(productAttributes[attr.slug] as string) || ''} onChange={e => setProductAttributes({ ...productAttributes, [attr.slug]: e.target.value })} placeholder={`Enter ${attr.name.toLowerCase()}`} />}
                      {attr.data_type === 'number' && <Input type="number" value={(productAttributes[attr.slug] as string) || ''} onChange={e => setProductAttributes({ ...productAttributes, [attr.slug]: parseFloat(e.target.value) || 0 })} placeholder={`Enter ${attr.name.toLowerCase()}`} />}
                      {attr.data_type === 'select' && (
                        <Select value={(productAttributes[attr.slug] as string) || ''} onValueChange={v => setProductAttributes({ ...productAttributes, [attr.slug]: v })}>
                          <SelectTrigger><SelectValue placeholder={`Select ${attr.name.toLowerCase()}`} /></SelectTrigger>
                          <SelectContent>{(attr.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {attr.data_type === 'boolean' && <div className="flex items-center gap-2 pt-2"><Switch checked={!!productAttributes[attr.slug]} onCheckedChange={v => setProductAttributes({ ...productAttributes, [attr.slug]: v })} /><Label>Yes</Label></div>}
                      {attr.data_type === 'date' && <Input type="date" value={(productAttributes[attr.slug] as string) || ''} onChange={e => setProductAttributes({ ...productAttributes, [attr.slug]: e.target.value })} />}
                      {attr.unit && <span className="text-xs text-muted-foreground ml-2">({attr.unit})</span>}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Step 3: Condition Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div><Label>Cosmetic Condition</Label><Textarea value={conditionDetails.cosmetic_condition || ''} onChange={e => setConditionDetails({ ...conditionDetails, cosmetic_condition: e.target.value })} rows={2} placeholder="Describe the cosmetic appearance..." /></div>
                <div><Label>Functional Condition</Label><Textarea value={conditionDetails.functional_condition || ''} onChange={e => setConditionDetails({ ...conditionDetails, functional_condition: e.target.value })} rows={2} placeholder="Describe how well it works..." /></div>
                <div><Label>Missing Accessories</Label><Textarea value={conditionDetails.missing_accessories || ''} onChange={e => setConditionDetails({ ...conditionDetails, missing_accessories: e.target.value })} rows={2} placeholder="List any missing accessories..." /></div>
                <div><Label>Repairs</Label><Textarea value={conditionDetails.repairs || ''} onChange={e => setConditionDetails({ ...conditionDetails, repairs: e.target.value })} rows={2} placeholder="Any repairs done..." /></div>
                <div><Label>Defects</Label><Textarea value={conditionDetails.defects || ''} onChange={e => setConditionDetails({ ...conditionDetails, defects: e.target.value })} rows={2} placeholder="Any known defects..." /></div>
                <div><Label>Scratches</Label><Textarea value={conditionDetails.scratches || ''} onChange={e => setConditionDetails({ ...conditionDetails, scratches: e.target.value })} rows={2} placeholder="Describe any scratches..." /></div>
                <div><Label>Additional Notes</Label><Textarea value={conditionDetails.additional_notes || ''} onChange={e => setConditionDetails({ ...conditionDetails, additional_notes: e.target.value })} rows={2} placeholder="Any other notes..." /></div>
              </div>
            )}

            {/* Step 4: Pricing */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div><Label>Price Type</Label><RadioGroup value={priceType} onValueChange={v => setPriceType(v as 'fixed' | 'negotiable' | 'free')} className="flex gap-4 pt-2"><div className="flex items-center gap-2"><RadioGroupItem value="fixed" id="fixed" /><Label htmlFor="fixed">Fixed Price</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="negotiable" id="negotiable" /><Label htmlFor="negotiable">Negotiable</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="free" id="free" /><Label htmlFor="free">Free</Label></div></RadioGroup></div>
                {priceType !== 'free' && (
                  <>
                    <div><Label>Selling Price *</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></div>
                    <div><Label>Original Price (optional)</Label><Input type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="0.00" /><p className="text-xs text-muted-foreground mt-1">Set to show a discount</p></div>
                    {discountAmount > 0 && <Badge variant="destructive" className="gap-1"><Percent className="h-3 w-3" /> {discountPercentage}% OFF (Save {formatPrice(discountAmount, 'fixed')})</Badge>}
                    <div className="flex items-center gap-2"><Switch checked={isNegotiable} onCheckedChange={setIsNegotiable} /><Label>Accept Offers</Label></div>
                    {isNegotiable && <div><Label>Minimum Offer</Label><Input type="number" value={minOffer} onChange={e => setMinOffer(e.target.value)} placeholder="0.00" /></div>}
                  </>
                )}
                <div><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}

            {/* Step 5: Media */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}`}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Drag and drop images here, or</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><ImageIcon className="h-4 w-4 mr-2" /> Browse Files</Button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && addFiles(Array.from(e.target.files))} />
                  <p className="text-xs text-muted-foreground mt-2">JPEG, PNG, WebP, GIF · Max 5MB each · Up to {MAX_IMAGES} images</p>
                </div>
                {existingImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {existingImages.map((img, i) => (
                      <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border">
                        <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5"><Star className="h-3 w-3 fill-current" /></div>
                      </div>
                    ))}
                  </div>
                )}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border">
                        <img src={preview} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveImage(i, 'up')} disabled={i === 0}><ChevronUp className="h-3 w-3" /></Button>
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveImage(i, 'down')} disabled={i === images.length - 1}><ChevronDown className="h-3 w-3" /></Button>
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setCoverImageIndex(i)}>{coverImageIndex === i ? <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> : <Star className="h-3 w-3" />}</Button>
                          <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => removeImage(i)}><X className="h-3 w-3" /></Button>
                        </div>
                        {coverImageIndex === i && <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5"><Star className="h-3 w-3 fill-current" /></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Shipping */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div>
                  <Label>Shipping Methods</Label>
                  <div className="flex flex-col gap-2 pt-2">
                    {(['local_pickup', 'nationwide', 'international'] as ShippingMethod[]).map(m => (
                      <div key={m} className="flex items-center gap-2">
                        <Checkbox checked={shippingMethods.includes(m)} onCheckedChange={() => toggleShippingMethod(m)} id={`ship-${m}`} />
                        <Label htmlFor={`ship-${m}`} className="capitalize">{m.replace(/_/g, ' ')}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div><Label>Shipping Fee Type</Label><RadioGroup value={shippingFeeType} onValueChange={v => setShippingFeeType(v as ShippingFeeType)} className="flex gap-4 pt-2"><div className="flex items-center gap-2"><RadioGroupItem value="free" id="free-ship" /><Label htmlFor="free-ship">Free</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="flat_rate" id="flat" /><Label htmlFor="flat">Flat Rate</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="calculated" id="calc" /><Label htmlFor="calc">Calculated</Label></div></RadioGroup></div>
                {shippingFeeType === 'flat_rate' && <div><Label>Shipping Fee</Label><Input type="number" value={shippingFee} onChange={e => setShippingFee(e.target.value)} placeholder="0.00" /></div>}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Estimated Delivery (days)</Label><Input type="number" value={estimatedDeliveryDays} onChange={e => setEstimatedDeliveryDays(e.target.value)} placeholder="3" /></div>
                  <div><Label>Handling Time (days)</Label><Input type="number" value={handlingTimeDays} onChange={e => setHandlingTimeDays(e.target.value)} placeholder="1" /></div>
                </div>
                <div><Label>Delivery Locations (comma-separated)</Label><Input value={deliveryLocations} onChange={e => setDeliveryLocations(e.target.value)} placeholder="Dhaka, Chattogram, Sylhet" /></div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><Label>Division *</Label><Select value={division} onValueChange={v => { setDivision(v); setDistrict(''); }}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>District *</Label><Select value={district} onValueChange={setDistrict} disabled={!division}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{division && DISTRICTS[division]?.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Area</Label><Input value={area} onChange={e => setArea(e.target.value)} placeholder="Optional" /></div>
                </div>
              </div>
            )}

            {/* Step 7: Warranty */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div><Label>Warranty Type</Label><RadioGroup value={warrantyType} onValueChange={v => setWarrantyType(v as WarrantyType)} className="flex gap-4 pt-2"><div className="flex items-center gap-2"><RadioGroupItem value="none" id="w-none" /><Label htmlFor="w-none">No Warranty</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="manufacturer" id="w-man" /><Label htmlFor="w-man">Manufacturer</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="seller" id="w-seller" /><Label htmlFor="w-seller">Seller</Label></div></RadioGroup></div>
                {warrantyType !== 'none' && (
                  <>
                    <div><Label>Warranty Duration (months)</Label><Input type="number" value={warrantyDuration} onChange={e => setWarrantyDuration(e.target.value)} placeholder="12" /></div>
                    <div><Label>Coverage</Label><Textarea value={warrantyCoverage} onChange={e => setWarrantyCoverage(e.target.value)} rows={3} placeholder="What does the warranty cover?" /></div>
                    <div><Label>Terms & Conditions</Label><Textarea value={warrantyTerms} onChange={e => setWarrantyTerms(e.target.value)} rows={3} placeholder="Warranty terms and conditions..." /></div>
                  </>
                )}
              </div>
            )}

            {/* Step 8: Review */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium text-right">{title}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{listingType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Condition</span><span className="font-medium capitalize">{condition}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">{priceType === 'free' ? 'Free' : formatPrice(parseFloat(price) || 0, priceType)}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><Badge variant="destructive">{discountPercentage}% OFF</Badge></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Images</span><span className="font-medium">{images.length + existingImages.length} images</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{division}, {district}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-medium">{shippingMethods.length > 0 ? shippingMethods.map(m => m.replace(/_/g, ' ')).join(', ') : 'Not specified'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Warranty</span><span className="font-medium capitalize">{warrantyType === 'none' ? 'No Warranty' : `${warrantyType} (${warrantyDuration || 0} months)`}</span></div>
                </div>
                <Separator />
                <div><Label>Schedule Publishing (optional)</Label><Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} /></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
          {currentStep < TOTAL_STEPS ? (
            <Button onClick={nextStep} className="gap-2">Next <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isSubmitting} className="gap-2"><Save className="h-4 w-4" /> Save Draft</Button>
              {scheduleDate && <Button variant="secondary" onClick={() => handleSubmit('scheduled')} disabled={isSubmitting} className="gap-2"><Calendar className="h-4 w-4" /> Schedule</Button>}
              <Button onClick={() => setShowPublishDialog(true)} disabled={isSubmitting} className="gap-2"><Send className="h-4 w-4" /> Publish</Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <MobileNav />

      {/* Publish Confirmation */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Publish Listing?</DialogTitle><DialogDescription>Your listing will be submitted for review. Once approved, it will be visible to buyers.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
            <Button onClick={() => { setShowPublishDialog(false); handleSubmit('pending'); }} disabled={isSubmitting} className="gap-2">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


