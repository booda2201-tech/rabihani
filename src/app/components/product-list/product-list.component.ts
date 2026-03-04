
import {
  Component,
  signal,
  HostListener,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit
} from '@angular/core';
import { gsap } from 'gsap';
import { register } from 'swiper/element/bundle';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../Services/api.service';
import { ChangeDetectorRef } from '@angular/core';

register();

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category: string;
  countryCode: string;
  image?: string;
  date?: string;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProductListComponent implements OnInit {
  // --- إعدادات الدول ---
  countries = [
    { name: 'مصر', code: 'EG', flag: '🇪🇬', currency: 'ج.م' },
    { name: 'السعودية', code: 'SA', flag: '🇸🇦', currency: 'ر.س' },
    { name: 'الإمارات', code: 'AE', flag: '🇦🇪', currency: 'د.إ' },
    { name: 'الكويت', code: 'KW', flag: '🇰🇼', currency: 'د.ك' },
    { name: 'قطر', code: 'QA', flag: '🇶🇦', currency: 'ر.ق' },
  ];

  selectedCountry = signal(this.loadCountryFromStorage());

  // --- كائنات المزامنة للمودال ---
newProduct: any = {
    name: '',
    category: { id: 0, name: '' },
    price: null,
    quantity: 1,
    description: ''
  };


  currentProduct: any = {
    id: 0,
    name: '',
    price: 0,
    quantity: 0,
    categoryId: 0,
    description: '',
    image: ''
  };

  // --- حالات المودال ---
  newProductImage: string = '';
  isAddModalOpen = signal(false);
  isModalOpen = signal(false);
  isAddCategoryModalOpen = signal(false);
  isCountryModalOpen = signal(false);
  newCategoryName: string = '';
  newCategoryDescription: string = '';
  selectedFile: File | null = null;
  selectedEditFile: File | null = null;
  categoryImagePreview: string | null = null;
  isEditCategoryModalOpen = signal(false);
  editCategoryData: any = { id: 0, name: '', description: '' };
  editCategoryFile: File | null = null;
  editCategoryImagePreview: string | null = null;


  // --- مصفوفات البيانات ---
  allProducts: any[] = [];        // كل المنتجات من الـ API
  filteredProducts: any[] = [];   // المنتجات المعروضة بعد الفلترة
  categories: any[] = [];         // الأقسام من الـ API
  categoryStats: any[] = [];      // الأقسام شاملة العد
  inventoryValue: number = 0;     // إجمالي قيمة المخزون

  // --- إعدادات الفلترة ---
  filterSearchTerm: string = '';
  filterCategory: string = 'الكل';
  filterStatus: string = 'الكل';
  filterSortBy: string = 'newest';
  filterDateFrom: string = '';
  filterDateTo: string = '';

  constructor(private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {
    setInterval(() => {
      const data = localStorage.getItem('selected_country');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.code !== this.selectedCountry().code) {
          this.selectedCountry.set(parsed);
          this.applyFilters(); // إعادة الفلترة لو الدولة اتغيرت
        }
      }
    }, 500);
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  // --- جلب البيانات ---
  loadProducts() {
    this.apiService.getProducts().subscribe({
      next: (data: any) => {
        this.allProducts = data;
        this.applyFilters();
        this.updateCategoryStats();
      },
      error: (err: any) => console.error('Error fetching products:', err)
    });
  }

  loadCategories() {
    this.apiService.getCategories().subscribe({
      next: (data: any) => {
        this.categories = data;
        this.updateCategoryStats();
      },
      error: (err: any) => console.error('Error fetching categories:', err)
    });
  }

applyFilters() {
  if (!this.allProducts) return;

  let list = [...this.allProducts];

  // 1. فلترة الدولة
  const currentCountryCode = this.selectedCountry().code;
  list = list.filter(p => !p.countryCode || p.countryCode === currentCountryCode);

  // 2. فلترة القسم
  if (this.filterCategory !== 'الكل') {
    list = list.filter(p => p.categoryId?.toString() === this.filterCategory);
  }

  // 3. فلترة البحث
  if (this.filterSearchTerm) {
    list = list.filter(p => p.name.toLowerCase().includes(this.filterSearchTerm.toLowerCase()));
  }

  // 4. فلترة التاريخ
  if (this.filterDateFrom) {
    list = list.filter(p => p.date && p.date >= this.filterDateFrom);
  }
  if (this.filterDateTo) {
    list = list.filter(p => p.date && p.date <= this.filterDateTo);
  }

  // 5. الترتيب (Sorting)
  if (this.filterSortBy === 'price-high') {
    list.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (this.filterSortBy === 'price-low') {
    list.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (this.filterSortBy === 'newest') {
    list.sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  this.filteredProducts = list;
  this.calculateInventoryValue();
}


calculateInventoryValue() {
  this.inventoryValue = this.filteredProducts.reduce((total, product) => {
    const price = Number(product.price) || 0;
    const qty = Number(product.quantity) || 1;
    return total + (price * qty);
  }, 0);
}

// أضف هذا المتغير في بداية الكلاس
readonly SERVER_URL = 'http://alhendalcompany-001-site7.stempurl.com/';

updateCategoryStats() {
  if (this.categories && this.categories.length > 0) {
    this.categoryStats = this.categories.map((cat: any) => {
      const count = this.allProducts.filter(p =>
        p.categoryId === cat.id || p.categoryName === cat.name
      ).length;

      // 1. الأولوية لمسمى iconUrl القادم من Postman
      let rawPath = cat.iconUrl || cat.icon || cat.iconPath || cat.image;
      let finalImageUrl = '';

      if (rawPath && rawPath !== 'null') {
        // التحقق إذا كان الرابط كاملاً (مثل روابط placeholder في الصورة) أو مساراً نسبياً
        if (rawPath.startsWith('http')) {
          finalImageUrl = rawPath;
        } else {
          const baseUrl = this.SERVER_URL.replace(/\/+$/, '');
          const cleanPath = rawPath.replace(/^\/+/, '');
          finalImageUrl = `${baseUrl}/${cleanPath}`;
        }
      } else {
        finalImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.name)}&background=random&size=128`;
      }

      return { ...cat, count, displayImage: finalImageUrl };
    });
    this.cdr.detectChanges();
  }
}

handleImageError(event: any) {
  const fallback = 'https://ui-avatars.com/api/?name=Error&background=333&color=fff';
  if (event.target.src === fallback) {
    event.target.style.display = 'none';
    return;
  }
  event.target.src = fallback;
}

setCategory(cat: any) {
  if (cat === 'الكل') {
    this.filterCategory = 'الكل';
  } else {
    // بنخزن الـ ID ونحوله لنص عشان نضمن إن المقارنة دقيقة
    this.filterCategory = cat.id.toString();
  }

  // نداء الفلترة فوراً
  this.applyFilters();
}

  // --- إدارة المنتجات ---
// تأكد من تحديث دالة الإضافة والتعديل لضمان قراءة البيانات صح
confirmAddProduct() {
  if (!this.newProduct.name || !this.newProduct.category?.id || !this.newProduct.price) {
    alert('برجاء إكمال البيانات الأساسية');
    return;
  }

  // استخدام FormData بدلاً من Object عادي لحل خطأ 415
  const formData = new FormData();
  formData.append('Name', this.newProduct.name);
  formData.append('Price', this.newProduct.price.toString());
  formData.append('Quantity', (this.newProduct.quantity || 1).toString());
  formData.append('CategoryId', this.newProduct.category.id.toString());
  formData.append('Description', this.newProduct.description || '');
  formData.append('CountryCode', this.selectedCountry().code);

  if (this.selectedFile) {
    formData.append('Image', this.selectedFile);
  }

  this.apiService.addProduct(formData).subscribe({
    next: () => {
      this.loadProducts();
      this.closeAddModal();
      this.resetNewProduct();
    },
    error: (err) => {
      console.error('Add Error:', err);
      alert('فشل الإضافة، راجع بيانات السيرفر');
    }
  });
}

saveProduct() {
  if (!this.currentProduct.id) return;

  const formData = new FormData();
  // إرسال البيانات الأساسية
  formData.append('Id', this.currentProduct.id.toString());
  formData.append('Name', this.currentProduct.name);
  formData.append('Price', this.currentProduct.price.toString());
  formData.append('CategoryId', this.currentProduct.categoryId.toString());
  formData.append('Description', this.currentProduct.description || '');
  formData.append('CountryCode', this.selectedCountry().code);

  // الجزء الخاص بالصورة: نستخدم selectedEditFile الذي يتم تعيينه في onEditImagePicked
  if (this.selectedEditFile) {
    formData.append('Image', this.selectedEditFile);
  }

  this.apiService.updateProduct(this.currentProduct.id, formData).subscribe({
    next: () => {
      this.loadProducts(); // إعادة تحميل القائمة لتظهر الصورة الجديدة
      this.closeModal();
      this.selectedEditFile = null; // تصفير الملف بعد النجاح
      alert('تم التعديل بنجاح');
    },
    error: (err) => {
      console.error('Update Error:', err);
      alert('حدث خطأ أثناء تحديث المنتج');
    }
  });
}


  resetNewProduct() {
    this.newProduct = {
      name: '',
      category: { id: 0, name: '' },
      price: null,
      quantity: 1,
      description: ''
    };
    this.newProductImage = '';
  }

  deleteProduct(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      this.apiService.deleteProduct(id).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err: any) => alert('عذراً، فشل حذف المنتج')
      });
    }
  }

confirmAddCategory() {
  if (!this.newCategoryName || !this.selectedFile) {
    alert('برجاء اختيار صورة واسم للقسم');
    return;
  }

  const formData = new FormData();
  formData.append('Name', this.newCategoryName);
  formData.append('Description', this.newCategoryDescription || '');
  // تأكد من مطابقة مسمى "Icon" المطلوب في خطأ الـ API
  formData.append('Icon', this.selectedFile);

  this.apiService.addCategory(formData).subscribe({
    next: (res) => {
      alert('تمت الإضافة بنجاح');
      this.loadCategories(); // لإعادة جلب البيانات وعرض الصورة الجديدة فوراً
      this.isAddCategoryModalOpen.set(false);
      this.resetCategoryForm(); // تصفير النموذج
    },
    error: (err) => {
      console.error('API Error:', err);
      alert('فشل إضافة القسم، تأكد من اختيار ملف صورة صحيح');
    }
  });
}

resetCategoryForm() {
  this.newCategoryName = '';
  this.newCategoryDescription = '';
  this.categoryImagePreview = null;
  this.selectedFile = null;
}

onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.selectedFile = file;
  }
}

  private loadCountryFromStorage() {
    const data = localStorage.getItem('selected_country');
    return data ? JSON.parse(data) : this.countries[0];
  }

  selectCountry(country: any) {
    this.selectedCountry.set(country);
    localStorage.setItem('selected_country', JSON.stringify(country));
    this.applyFilters();
  }

  // --- رفع الصور ---
onImagePicked(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => { this.newProductImage = reader.result as string; }; // للعرض فقط
    reader.readAsDataURL(file);
  }
}

onEditImagePicked(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.selectedEditFile = file; // مهم جداً للإرسال
    const reader = new FileReader();
    reader.onload = () => {
      this.currentProduct.image = reader.result as string; // للعرض الفوري
    };
    reader.readAsDataURL(file);
  }
}

  removeImage() {
    this.currentProduct.image = '';
  }

  // --- أيقونات الأقسام ---
  getIconForCategory(cat: string): string {
    const icons: any = {
      إلكترونيات: 'bi-laptop',
      ملابس: 'bi-universal-access',
      'أدوات منزلية': 'bi-house-heart',
      أحذية: 'bi-universal-access-circle',
    };
    return icons[cat] || 'bi-tag';
  }

  // --- التحكم في المودال ---
  openAddModal() { this.isAddModalOpen.set(true); }
  closeAddModal() { this.isAddModalOpen.set(false); }

openEditModal(product: any) {
    this.currentProduct = {
      ...product,
      categoryId: product.categoryId || (product.category ? product.category.id : 0)
    };
    this.isModalOpen.set(true);
  }

  closeModal() { this.isModalOpen.set(false); }

  // --- المستمعات (Listeners) ---
  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent) {
    if (event.key === 'selected_country' && event.newValue) {
      this.selectedCountry.set(JSON.parse(event.newValue));
      this.applyFilters();
    }
  }

  lastScrollTop = 0;
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const st = window.pageYOffset || document.documentElement.scrollTop;
    gsap.to('.fixed-menu-btn', {
      y: st > this.lastScrollTop ? 100 : 0,
      duration: 0.3,
    });
    this.lastScrollTop = st <= 0 ? 0 : st;
  }



// 1. دالة حذف القسم
deleteCat(category: any) {
  if (confirm(`هل أنت متأكد من حذف قسم "${category.name}"`)) {
    this.apiService.deleteCategory(category.id).subscribe({
      next: () => {
        alert('تم حذف القسم بنجاح');
        this.loadCategories();
        this.loadProducts();
      },
      error: (err) => {
        console.error(err);
        alert('فشل الحذف. تأكد أن القسم لا يحتوي على منتجات مرتبطة به.');
      }
    });
  }
}

// 2. دالة تعديل القسم
editCat(category: any) {
  this.editCategoryData = { ...category };
  // عرض الصورة الحالية في المعاينة
  this.editCategoryImagePreview = category.displayImage;
  this.editCategoryFile = null;
  this.isEditCategoryModalOpen.set(true);
}

onEditCategoryFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.editCategoryFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.editCategoryImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}

confirmUpdateCategory() {
  if (!this.editCategoryData.name) {
    alert('اسم القسم مطلوب');
    return;
  }

  const formData = new FormData();
  formData.append('Id', this.editCategoryData.id.toString());
  formData.append('Name', this.editCategoryData.name);
  formData.append('Description', this.editCategoryData.description || 'لا يوجد وصف');

  // نرسل الملف الجديد فقط إذا قام المستخدم بتغييره
  if (this.editCategoryFile) {
    formData.append('Icon', this.editCategoryFile);
  }

  this.apiService.updateCategory(this.editCategoryData.id, formData).subscribe({
    next: () => {
      alert('تم تحديث القسم بنجاح');
      this.loadCategories();
      this.isEditCategoryModalOpen.set(false);
    },
    error: (err) => {
      console.error(err);
      alert('فشل التحديث، راجع بيانات السيرفر');
    }
  });
}


onCategoryFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.selectedFile = file;


    const reader = new FileReader();
    reader.onload = () => {
      this.categoryImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}

removeSelectedCategoryImg() {
  this.selectedFile = null;
  this.categoryImagePreview = null;
}



}
