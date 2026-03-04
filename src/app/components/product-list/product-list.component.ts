// import {
//   Component,
//   signal,
//   computed,
//   effect,
//   HostListener,
//   CUSTOM_ELEMENTS_SCHEMA,
// } from '@angular/core';
// import { gsap } from 'gsap';
// import { register } from 'swiper/element/bundle';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { ApiService } from '../../Services/api.service';

// register();

// interface Product {
//   id: number;
//   name: string;
//   price: number;
//   quantity: number;
//   category: string;
//   countryCode: string;
//   image?: string;
//   date?: string;
// }

// @Component({
//   selector: 'app-product-list',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './product-list.component.html',
//   styleUrls: ['./product-list.component.scss'],
//   schemas: [CUSTOM_ELEMENTS_SCHEMA],
// })
// export class ProductListComponent {
//   // --- إعدادات الدول ---
//   countries = [
//     { name: 'مصر', code: 'EG', flag: '🇪🇬', currency: 'ج.م' },
//     { name: 'السعودية', code: 'SA', flag: '🇸🇦', currency: 'ر.س' },
//     { name: 'الإمارات', code: 'AE', flag: '🇦🇪', currency: 'د.إ' },
//     { name: 'الكويت', code: 'KW', flag: '🇰🇼', currency: 'د.ك' },
//     { name: 'قطر', code: 'QA', flag: '🇶🇦', currency: 'ر.ق' },
//   ];

//   // --- تحديث كائن المنتج الحالي ---
//   currentProduct = {
//     id: 0,
//     name: '',
//     price: 0,
//     quantity: 0,
//     category: '',
//     countryCode: '',
//     image: '',
//   };

//   // --- تحديث كائن المنتج الجديد (للمزامنة) ---
// newProduct: any = {
//   name: '',
//   category: { id: 0, name: '' },
//   price: 0,
//   quantity: 0,
//   image: '',
// };

//   // الدولة المختارة (يتم تحميلها من التخزين لضمان المزامنة مع الداش بورد)
//   selectedCountry = signal(this.loadCountryFromStorage());
//   isCountryModalOpen = signal(false);

//   // --- إعدادات الفلترة ---
//   selectedCategory = signal<string>('الكل');
//   searchTerm = signal<string>('');
//   selectedStatus = signal<string>('الكل');
//   sortBy = signal<string>('newest');
//   dateFrom = signal<string>('');
//   dateTo = signal<string>('');

//   // --- حالات المودال ---
//   newProductImage: string = '';
//   isAddModalOpen = signal(false);
//   isModalOpen = signal(false);
//   isAddCategoryModalOpen = signal(false);


//   allProducts: any[] = [];
// // المصفوفة التي سيتم عرضها في الـ HTML بعد الفلترة
// filteredProducts: any[] = [];

// // قيم الفلاتر الافتراضية
// filterSearchTerm: string = '';
// filterCategory: string = 'الكل';
// filterStatus: string = 'الكل';
// filterSortBy: string = 'newest';
// filterDateFrom: string = '';
// filterDateTo: string = '';









//   products: any[] = [];
//   categories: any[] = [];
//   newCategoryName = '';
//   categoryStats: any[] = [];
//   inventoryValue: number = 0;


//   constructor(private apiService: ApiService) {

//     setInterval(() => {
//       const data = localStorage.getItem('selected_country');
//       if (data) {
//         const parsed = JSON.parse(data);
//         if (parsed.code !== this.selectedCountry().code) {
//           this.selectedCountry.set(parsed);
//         }
//       }
//     }, 500); // يفحص كل نصف ثانية للتأكد من المزامنة الفورية
//   }



//   // totalInventoryValue(){}
//   // totalProducts(){}
//   ngOnInit() {
//     this.loadProducts();
//     this.loadCategories();
//   }

// loadProducts() {
//   this.apiService.getProducts().subscribe({
//     next: (data: any) => {
//       this.products = data;
//       this.calculateTotals(); // نحسب القيمة أول ما المنتجات تيجي
//       this.updateCategoryStats();    // نحدث العد
//     },
//     error: (err: any) => console.error(err)
//   });
// }

// loadCategories() {
//   this.apiService.getCategories().subscribe({
//     next: (data: any) => {
//       this.categories = data;
//       this.updateCategoryStats(); // نحدث العد أول ما الأقسام تيجي
//     },
//     error: (err: any) => console.error(err)
//   });
// }

// calculateTotals() {
//   // بنصفر القيمة قبل ما نبدأ نجمع عشان لو الدالة اتنادت كذا مرة
//   let total = 0;

//   this.products.forEach(p => {
//     // تأكد إن الأسماء (price) و (quantity) مطابقة للي بتشوفه في Postman
//     const price = Number(p.price) || 0;
//     const qty = Number(p.quantity) || 0;
//     total += (price * qty);
//   });

//   this.inventoryValue = total;
//   console.log('إجمالي قيمة المخزون الحالية:', this.inventoryValue);
// }

// // 4. دالة عد المنتجات في كل قسم
// updateCategoryStats() {
//   if (this.categories && this.products) {
//     this.categoryStats = this.categories.map((cat: any) => {
//       const count = this.products.filter(p =>
//         p.categoryId === cat.id || p.categoryName === cat.name
//       ).length;
//       return { ...cat, count: count };
//     });
//   }
// }

// calculateInventoryValue() {
//   this.inventoryValue = this.products.reduce((acc, p) => {
//     return acc + (p.price * (p.quantity || 0));
//   }, 0);
// }

// // // دالة حساب عدد المنتجات لكل قسم
// // updateCategoryCounts() {
// //   if (this.categories.length > 0 && this.products.length > 0) {
// //     this.categoryStats = this.categories.map(cat => {
// //       const count = this.products.filter(p =>
// //         p.categoryId === cat.id || p.categoryName === cat.name
// //       ).length;
// //       return { ...cat, count: count };
// //     });
// //   } else {
// //     this.categoryStats = this.categories; // لو لسه مفيش منتجات اعرض الأقسام بـ 0
// //   }
// // }

// setCategory(catName: string) {
//   this.filterCategory = catName;
//   this.applyFilters();
// }

//   // --- الفلترة الذكية بناءً على الدولة والبحث ---
// applyFilters() {
//   // 1. نبدأ بنسخة من كل المنتجات
//   let list = [...this.allProducts];

//   // 2. الفلترة حسب الدولة المختارة
//   const currentCountry = this.selectedCountry(); // لو كانت Signal اتركها، لو لا استخدم المتغير العادي
//   list = list.filter(p => p.countryCode === currentCountry.code);

//   // 3. الفلترة حسب البحث بالاسم
//   if (this.filterSearchTerm) {
//     list = list.filter(p =>
//       p.name.toLowerCase().includes(this.filterSearchTerm.toLowerCase())
//     );
//   }

//   // 4. الفلترة حسب القسم
//   if (this.filterCategory !== 'الكل') {
//     list = list.filter(p => p.categoryName === this.filterCategory);
//   }

//   // 5. الفلترة حسب الحالة (نشط / غير نشط)
//   if (this.filterStatus !== 'الكل') {
//     list = list.filter(p =>
//       this.filterStatus === 'active' ? p.quantity > 0 : p.quantity <= 0
//     );
//   }

//   // 6. الفلترة حسب التاريخ
//   if (this.filterDateFrom) {
//     list = list.filter(p => new Date(p.date) >= new Date(this.filterDateFrom));
//   }
//   if (this.filterDateTo) {
//     list = list.filter(p => new Date(p.date) <= new Date(this.filterDateTo));
//   }

//   // 7. الترتيب (Sorting)
//   list.sort((a, b) => {
//     if (this.filterSortBy === 'price-high') return b.price - a.price;
//     if (this.filterSortBy === 'price-low') return a.price - b.price;
//     // الترتيب الافتراضي: الأحدث
//     return new Date(b.date).getTime() - new Date(a.date).getTime();
//   });

//   // 8. تحديث القائمة المعروضة
//   this.filteredProducts = list;

//   // تحديث الحسابات (إجمالي المخزون) بناءً على القائمة المفلترة فقط
//   this.calculateInventoryValue();
// }

//   // categoryStats = computed(() => {
//   //   // const countryProds = this.allProducts().filter(
//   //   //   (p) => p.countryCode === this.selectedCountry().code,
//   //   // );
//   //   return this.categoriesList().map((cat) => ({
//   //     name: cat,
//   //     // count: countryProds.filter((p) => p.category === cat).length,
//   //     icon: this.getIconForCategory(cat),
//   //   }));
//   // });

//   // totalProducts = computed(() => this.filteredProducts().length);


//   // --- إدارة الدول ---


// private loadCountryFromStorage() {
//   const data = localStorage.getItem('selected_country');
//   return data ? JSON.parse(data) : this.countries[0];
// }

//   selectCountry(country: any) {
//     this.selectedCountry.set(country);
//     localStorage.setItem('selected_country', JSON.stringify(country));
//   }

//   // --- إدارة المنتجات ---
// confirmAddProduct() {
//     if (!this.newProduct.name || !this.newProduct.category?.id) {
//       alert('برجاء إكمال البيانات واختيار القسم');
//       return;
//     }

//     const productData = {
//       name: this.newProduct.name,
//       price: this.newProduct.price,
//       quantity: this.newProduct.quantity || 0,
//       categoryId: this.newProduct.category.id, // الآن سيقرأ الـ id بنجاح
//       imageUrl: this.newProductImage,
//       countryCode: this.selectedCountry().code
//     };

//     this.apiService.addProduct(productData).subscribe({
//       next: (res: any) => { // تحديد النوع :any يحل خطأ الصورة 1
//         this.loadProducts();
//         this.closeAddModal();
//         this.newProduct = { name: '', category: { id: 0, name: '' }, price: 0, quantity: 0, image: '' };
//       },
//       error: (err: any) => console.error('Error:', err)
//     });
//   }

// saveProduct() {
//     if (!this.currentProduct.id) return;

//     this.apiService.updateProduct(this.currentProduct.id, this.currentProduct).subscribe({
//       next: (res: any) => {
//         this.loadProducts();
//         this.closeModal();
//       },
//       error: (err: any) => console.error('Error:', err)
//     });
//   }

// deleteProduct(id: number) {
//   if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
//     this.apiService.deleteProduct(id).subscribe({
//       next: () => {
//         // تحديث القائمة فوراً في الواجهة
//         this.products = this.products.filter((p: any) => p.id !== id);
//       },
//       error: (err: any) => alert('عذراً، فشل حذف المنتج')
//     });
//   }
// }

//   // --- التخزين ---
//   private loadCategoriesFromStorage(): string[] {
//     const cats = localStorage.getItem('my_categories');
//     return cats
//       ? JSON.parse(cats)
//       : ['إلكترونيات', 'ملابس', 'أدوات منزلية', 'أحذية'];
//   }


//   openAddModal() {
//     this.isAddModalOpen.set(true);
//   }
//   closeAddModal() {
//     this.isAddModalOpen.set(false);
//   }
//   openEditModal(product: any) {
//     this.currentProduct = { ...product };
//     this.isModalOpen.set(true);
//   }
//   closeModal() {
//     this.isModalOpen.set(false);
//   }
//   // setCategory(cat: string) {
//   //   this.selectedCategory.set(cat);
//   // }



// confirmAddCategory() {
//   const name = this.newCategoryName.trim();
//   if (!name) return;

//   const categoryData = {
//     name: name,
//     iconUrl: 'bi-tag' // أي أيقونة افتراضية
//   };

//   this.apiService.addCategory(categoryData).subscribe({
//     next: () => {
//       this.loadCategories(); // تحديث السلايدر (Swiper)
//       this.newCategoryName = '';
//       this.isAddCategoryModalOpen.set(false);
//     },
//     error: (err: any) => console.error('خطأ في إضافة القسم:', err)
//   });
// }


//   editCat(oldName: string) {
//     // const newName = prompt('تعديل اسم القسم:', oldName);
//     // if (newName && newName.trim() !== '' && newName !== oldName) {
//     //   const trimmed = newName.trim();
//     //   this.categories.update((cat) =>
//     //     cats.map((c) => (c === oldName ? trimmed : c)),
//     //   );
//     // //   this.allProducts.update((prods) =>
//     // //     prods.map((p) =>
//     // //       p.category === oldName ? { ...p, category: trimmed } : p,
//     // //     ),
//     // //   );
//     // }
//   }

//   deleteCat(catName: string) {
//     // if (confirm(`حذف القسم سيؤثر على المنتجات المرتبطة به. هل أنت متأكد؟`)) {
//     //   this.categoriesList.update((cats) => cats.filter((c) => c !== catName));
//     // }
//   }



//   getIconForCategory(cat: string): string {
//     const icons: any = {
//       إلكترونيات: 'bi-laptop',
//       ملابس: 'bi-universal-access',
//       'أدوات منزلية': 'bi-house-heart',
//       أحذية: 'bi-universal-access-circle',
//     };
//     return icons[cat] || 'bi-tag';
//   }

//   @HostListener('window:storage', ['$event'])
//   onStorageChange(event: StorageEvent) {
//     if (event.key === 'selected_country' && event.newValue) {
//       this.selectedCountry.set(JSON.parse(event.newValue));
//     }
//     // إذا تغيرت المنتجات من شاشة أخرى (لو فتحت تاب جديد)
//     // if (event.key === 'my_products' && event.newValue) {
//     //   this.allProducts.set(JSON.parse(event.newValue));
//     // }
//   }
//   lastScrollTop = 0;
//   @HostListener('window:scroll', [])
//   onWindowScroll() {
//     const st = window.pageYOffset || document.documentElement.scrollTop;
//     gsap.to('.fixed-menu-btn', {
//       y: st > this.lastScrollTop ? 100 : 0,
//       duration: 0.3,
//     });
//     this.lastScrollTop = st <= 0 ? 0 : st;
//   }

//   onImagePicked(event: any) {
//     const file = event.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = () => {
//         this.newProductImage = reader.result as string;
//       };
//       reader.readAsDataURL(file);
//     }
//   }

//   removeImage() {
//     this.currentProduct.image = '';
//   }

//   // دالة رفع الصورة
//   onEditImagePicked(event: any) {
//     const file = event.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = () => {
//         this.currentProduct.image = reader.result as string;
//       };
//       reader.readAsDataURL(file);
//     }
//   }

// totalProducts() {
//   return this.products ? this.products.length : 0;
// }

// // حساب قيمة المخزون (السعر * الكمية لكل المنتجات)
// totalInventoryValue() {
//   if (!this.products) return 0;
//   return this.products.reduce((acc: number, p: any) => acc + (p.price * (p.quantity || 0)), 0);
// }

// }





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
