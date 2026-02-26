import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';




export interface LastBidder {
  name: string;
  isAi: boolean;
  time?: string;
}

export interface AuctionItem {
  id: number;
  name: string;
  officialPrice: number;
  img: string;
  currentBid: number;
  targetPrice: number;
  timeLeft: number;
  countryCode: string;
  status: 'active' | 'upcoming' | 'completed';
  lastBidder: LastBidder;
  startPrice?: number;
  totalPoints?: number;
  startDate?: string;
  endDate?: string;
}


@Component({
  selector: 'app-auctions',
  templateUrl: './auctions.component.html',
  styleUrls: ['./auctions.component.scss']
})
export class AuctionsComponent implements OnInit, OnDestroy {
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  currentFilter = signal<'active' | 'upcoming' | 'completed'>('active');
  itemsToShow = signal(4);
  showAddModal = false;
  isEditMode = false;
  selectedItem: any = null;
  timerInterval: any;
  selectedCountry = signal(this.getCountryFromStorage());

  newAuctionObj = {
      name: '',
      date: '',
      hours: 24,
      startPoints: 0,
      targetPoints: 0,
      officialPrice: 0,
      img: ''
    };


allAuctions = signal<AuctionItem[]>([
    // ================== مصر EG ==================
    { id: 1, countryCode: 'EG', status: 'active', name: 'MacBook Pro M3 Max', officialPrice: 185000, img: 'https://picsum.photos/id/0/600/400', startPrice: 500, currentBid: 125500, targetPrice: 150000, totalPoints: 18400, timeLeft: 3665, lastBidder: { name: 'أحمد علي', isAi: false, time: 'ثانيتين' } },
    { id: 2, countryCode: 'EG', status: 'active', name: 'iPhone 15 Pro Max', officialPrice: 55000, img: 'https://m.media-amazon.com/images/I/81+GIkwqLIL._AC_SL1500_.jpg', startPrice: 300, currentBid: 55000, targetPrice: 60000, totalPoints: 10200, timeLeft: 5400, lastBidder: { name: 'محمود شاكر', isAi: false, time: '5 ثوانٍ' } },
    { id: 5, countryCode: 'EG', status: 'active', name: 'iPad Air M2', officialPrice: 75000, img: 'https://picsum.photos/id/9/600/400', startPrice: 150, currentBid: 2800, targetPrice: 80000, totalPoints: 4000, timeLeft: 15000, lastBidder: { name: 'سارة أحمد', isAi: false, time: '10 ثوانٍ' } },
    { id: 10, countryCode: 'EG', status: 'active', name: 'Samsung S25 Ultra', officialPrice: 65000, img: 'https://images.unsplash.com/photo-1707201355080-60604118f6d2?q=80&w=500', currentBid: 48000, targetPrice: 62000, timeLeft: 12000, lastBidder: { name: 'ياسين كمال', isAi: false } },
    { id: 17, countryCode: 'EG', status: 'active', name: 'ثلاجة LG InstaView', officialPrice: 75000, img: 'https://picsum.photos/id/160/600/400', startPrice: 2000, currentBid: 42000, targetPrice: 65000, totalPoints: 50000, timeLeft: 86400, lastBidder: { name: 'هاني رمزي', isAi: false, time: 'دقيقة' } },
    { id: 21, countryCode: 'EG', status: 'active', name: 'شاشة LG OLED 65"', officialPrice: 55000, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=500', currentBid: 32000, targetPrice: 45000, timeLeft: 25000, lastBidder: { name: 'عمر خالد', isAi: true } },
    { id: 40, countryCode: 'EG', status: 'active', name: 'كاميرا Sony A7 IV', officialPrice: 120000, img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=500', currentBid: 95000, targetPrice: 110000, timeLeft: 43200, lastBidder: { name: 'إبراهيم', isAi: false } },
    { id: 41, countryCode: 'EG', status: 'active', name: 'ساعة Garmin Epix 2', officialPrice: 28000, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=500', currentBid: 18000, targetPrice: 22000, timeLeft: 86400, lastBidder: { name: 'سارة', isAi: false } },
    { id: 42, countryCode: 'EG', status: 'active', name: 'لابتوب Dell XPS 15', officialPrice: 95000, img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=500', currentBid: 65000, targetPrice: 80000, timeLeft: 5000, lastBidder: { name: 'نور الدين', isAi: true } },
    { id: 61, countryCode: 'EG', status: 'active', name: 'غسالة Samsung AddWash', officialPrice: 35000, img: 'https://images.unsplash.com/photo-1582733775062-eb92170f5e1f?q=80&w=500', currentBid: 22000, targetPrice: 30000, timeLeft: 18000, lastBidder: { name: 'مصطفى كامل', isAi: false } },
    { id: 3, countryCode: 'EG', status: 'upcoming', name: 'iPad Pro M4', officialPrice: 65000, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=500', currentBid: 0, targetPrice: 60000, timeLeft: 0, startDate: '2026-03-10', lastBidder: { name: '-', isAi: false } },
    { id: 22, countryCode: 'EG', status: 'upcoming', name: 'سماعات AirPods Max', officialPrice: 38000, img: 'https://images.unsplash.com/photo-1613040819284-6de569567a9a?q=80&w=500', currentBid: 0, targetPrice: 35000, timeLeft: 0, startDate: '2026-03-15', lastBidder: { name: '-', isAi: false } },
    { id: 43, countryCode: 'EG', status: 'upcoming', name: 'طقم ذهب عيار 21', officialPrice: 150000, img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=500', currentBid: 0, targetPrice: 120000, timeLeft: 0, startDate: '2026-03-20', lastBidder: { name: '-', isAi: false } },
    { id: 11, countryCode: 'EG', status: 'completed', name: 'Canon EOS R5', officialPrice: 160000, img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=500', currentBid: 140000, targetPrice: 140000, timeLeft: 0, endDate: '2026-02-15', lastBidder: { name: 'علي حسن', isAi: false } },
    { id: 23, countryCode: 'EG', status: 'completed', name: 'PlayStation 5 Slim', officialPrice: 32000, img: 'https://images.unsplash.com/photo-1606813907291-d86ebb9954ad?q=80&w=500', currentBid: 28000, targetPrice: 28000, timeLeft: 0, endDate: '2026-02-10', lastBidder: { name: 'كريم أشرف', isAi: false } },
    { id: 44, countryCode: 'EG', status: 'completed', name: 'سكوتر كهربائي', officialPrice: 15000, img: 'https://images.unsplash.com/photo-1595180635489-08573199c43d?q=80&w=500', currentBid: 12000, targetPrice: 12000, timeLeft: 0, endDate: '2026-02-01', lastBidder: { name: 'هاني', isAi: false } },

    // ================== السعودية SA ==================
    { id: 4, countryCode: 'SA', status: 'active', name: 'Sony PS5 Pro', officialPrice: 3800, img: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=500', startPrice: 200, currentBid: 3200, targetPrice: 4500, totalPoints: 5200, timeLeft: 90000, lastBidder: { name: 'فهد الشمري', isAi: false, time: 'دقيقة' } },
    { id: 9, countryCode: 'SA', status: 'active', name: 'Samsung 75" Neo QLED', officialPrice: 75000, img: 'https://picsum.photos/id/231/600/400', startPrice: 1000, currentBid: 8500, targetPrice: 12000, totalPoints: 11000, timeLeft: 54000, lastBidder: { name: 'البوت الذكي', isAi: true, time: 'لحظة' } },
    { id: 12, countryCode: 'SA', status: 'active', name: 'DJI Avata 2 Drone', officialPrice: 5200, img: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=500', currentBid: 4100, targetPrice: 5500, timeLeft: 45000, lastBidder: { name: 'سلطان بن عبدالعزيز', isAi: true } },
    { id: 16, countryCode: 'SA', status: 'active', name: 'نظام صوتي Bose 700', officialPrice: 75000, img: 'https://picsum.photos/id/211/600/400', startPrice: 150, currentBid: 1800, targetPrice: 3000, totalPoints: 2500, timeLeft: 12000, lastBidder: { name: 'سلطان محمد', isAi: false, time: '5 ثوانٍ' } },
    { id: 24, countryCode: 'SA', status: 'active', name: 'لابتوب Razer Blade 16', officialPrice: 18000, img: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=500', currentBid: 12500, targetPrice: 16000, timeLeft: 15000, lastBidder: { name: 'بدر العتيبي', isAi: false } },
    { id: 45, countryCode: 'SA', status: 'active', name: 'iPad Air M2', officialPrice: 3400, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=500', currentBid: 2800, targetPrice: 3500, timeLeft: 7200, lastBidder: { name: 'فيصل', isAi: false } },
    { id: 46, countryCode: 'SA', status: 'active', name: 'طقم كنب ملكي', officialPrice: 15000, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=500', currentBid: 8000, targetPrice: 12000, timeLeft: 172800, lastBidder: { name: 'أم ريما', isAi: false } },
    { id: 13, countryCode: 'SA', status: 'active', name: 'قهوة مختصة - فاخرة', officialPrice: 950, img: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=500', currentBid: 450, targetPrice: 800, timeLeft: 3600, lastBidder: { name: 'نورة عبدالله', isAi: false } },
    { id: 62, countryCode: 'SA', status: 'active', name: 'هاتف Honor Magic V3', officialPrice: 6500, img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=500', currentBid: 4200, targetPrice: 5800, timeLeft: 25000, lastBidder: { name: 'تركي آل الشيخ', isAi: false } },
    { id: 5, countryCode: 'SA', status: 'upcoming', name: 'ساعة رولكس أصلية', officialPrice: 95000, img: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=500', currentBid: 0, targetPrice: 85000, timeLeft: 0, startDate: '2026-03-01', lastBidder: { name: '-', isAi: false } },
    { id: 25, countryCode: 'SA', status: 'upcoming', name: 'تويوتا لاندكروزر 2026', officialPrice: 350000, img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=500', currentBid: 0, targetPrice: 320000, timeLeft: 0, startDate: '2026-04-01', lastBidder: { name: '-', isAi: false } },
    { id: 47, countryCode: 'SA', status: 'upcoming', name: 'مجموعة بخور ملكي', officialPrice: 2000, img: 'https://images.unsplash.com/photo-1595131838595-3154b9f4450b?q=80&w=500', currentBid: 0, targetPrice: 1500, timeLeft: 0, startDate: '2026-03-05', lastBidder: { name: '-', isAi: false } },
    { id: 14, countryCode: 'SA', status: 'completed', name: 'بخور عود كمبودي', officialPrice: 3000, img: 'https://images.unsplash.com/photo-1595131838595-3154b9f4450b?q=80&w=500', currentBid: 2500, targetPrice: 2500, timeLeft: 0, endDate: '2026-02-20', lastBidder: { name: 'عبدالرحمن', isAi: false } },
    { id: 26, countryCode: 'SA', status: 'completed', name: 'نظارة Ray-Ban', officialPrice: 2200, img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=500', currentBid: 1800, targetPrice: 1800, timeLeft: 0, endDate: '2026-01-30', lastBidder: { name: 'سلمان الخطيب', isAi: false } },
    { id: 48, countryCode: 'SA', status: 'completed', name: 'تلفزيون سامسونج 85', officialPrice: 13500, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=500', currentBid: 11000, targetPrice: 11000, timeLeft: 0, endDate: '2026-01-15', lastBidder: { name: 'عادل', isAi: false } },

    // ================== الإمارات AE ==================
    { id: 4, countryCode: 'AE', status: 'active', name: 'Samsung Galaxy S21 Ultra', officialPrice: 75000, img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=500', startPrice: 400, currentBid: 6500, targetPrice: 8000, totalPoints: 9100, timeLeft: 450000, lastBidder: { name: 'البوت الذكي', isAi: true, time: 'لحظة' } },
    { id: 6, countryCode: 'AE', status: 'active', name: 'Apple Vision Pro', officialPrice: 16500, img: 'https://images.unsplash.com/photo-1626218174358-77b7f9dd98b9?q=80&w=500', currentBid: 12000, targetPrice: 15000, timeLeft: 4500, lastBidder: { name: 'زايد', isAi: false } },
    { id: 26, countryCode: 'AE', status: 'active', name: 'DJI Mavic 3 Pro', officialPrice: 75000, img: 'https://picsum.photos/id/26/600/400', startPrice: 1000, currentBid: 14200, targetPrice: 20000, totalPoints: 19000, timeLeft: 86400, lastBidder: { name: 'جاسم محمد', isAi: false, time: 'دقيقة' } },
    { id: 11, countryCode: 'AE', status: 'active', name: 'Apple Watch Ultra 2', officialPrice: 75000, img: 'https://picsum.photos/id/20/600/400', startPrice: 300, currentBid: 3800, targetPrice: 4500, totalPoints: 5000, timeLeft: 12000, lastBidder: { name: 'البوت الذكي', isAi: true, time: 'ثانية' } },
    { id: 18, countryCode: 'AE', status: 'active', name: 'Tesla Wall Connector', officialPrice: 75000, img: 'https://picsum.photos/id/102/600/400', startPrice: 500, currentBid: 4100, targetPrice: 6000, totalPoints: 5500, timeLeft: 21000, lastBidder: { name: 'سعيد الفلاسي', isAi: false, time: '10 ثوانٍ' } },
    { id: 15, countryCode: 'AE', status: 'active', name: 'لوحة سيارة مميزة (7)', officialPrice: 1000000, img: 'https://images.unsplash.com/photo-1594913785162-e6785b493bd2?q=80&w=500', currentBid: 250000, targetPrice: 500000, timeLeft: 172800, lastBidder: { name: 'محمد آل مكتوم', isAi: false } },
    { id: 27, countryCode: 'AE', status: 'active', name: 'حقيبة Hermès Birkin', officialPrice: 75000, img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=500', currentBid: 45000, targetPrice: 60000, timeLeft: 86400, lastBidder: { name: 'ريم السويدي', isAi: false } },
    { id: 49, countryCode: 'AE', status: 'active', name: 'سماعات Devialet Phantom', officialPrice: 16000, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=500', currentBid: 11500, targetPrice: 14000, timeLeft: 12000, lastBidder: { name: 'سيف', isAi: true } },
    { id: 50, countryCode: 'AE', status: 'active', name: 'ساعة Patek Philippe', officialPrice: 250000, img: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=500', currentBid: 180000, targetPrice: 220000, timeLeft: 300000, lastBidder: { name: 'حمدان', isAi: false } },
    { id: 51, countryCode: 'AE', status: 'active', name: 'دراجة Ducati Panigale', officialPrice: 125000, img: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=500', currentBid: 85000, targetPrice: 100000, timeLeft: 60000, lastBidder: { name: 'راشد', isAi: false } },
    { id: 63, countryCode: 'AE', status: 'active', name: 'جت سكي Sea-Doo 2026', officialPrice: 85000, img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=500', currentBid: 55000, targetPrice: 75000, timeLeft: 43200, lastBidder: { name: 'منصور', isAi: false } },
    { id: 16, countryCode: 'AE', status: 'upcoming', name: 'سبيكة ذهب 24 قيراط', officialPrice: 15000, img: 'https://images.unsplash.com/photo-1610375461246-83df82444002?q=80&w=500', currentBid: 0, targetPrice: 12000, timeLeft: 0, startDate: '2026-03-05', lastBidder: { name: '-', isAi: false } },
    { id: 28, countryCode: 'AE', status: 'upcoming', name: 'ساعة Hublot Big Bang', officialPrice: 110000, img: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=500', currentBid: 0, targetPrice: 95000, timeLeft: 0, startDate: '2026-03-25', lastBidder: { name: '-', isAi: false } },
    { id: 52, countryCode: 'AE', status: 'upcoming', name: 'يخت Galeon 500', officialPrice: 2000000, img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=500', currentBid: 0, targetPrice: 1500000, timeLeft: 0, startDate: '2026-05-01', lastBidder: { name: '-', isAi: false } },
    { id: 7, countryCode: 'AE', status: 'completed', name: 'Tesla Model 3 Key', officialPrice: 4500, img: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=500', currentBid: 3500, targetPrice: 3500, timeLeft: 0, endDate: '2026-01-20', lastBidder: { name: 'خليفة', isAi: false } },
    { id: 29, countryCode: 'AE', status: 'completed', name: 'إقامة في برج العرب', officialPrice: 20000, img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=500', currentBid: 15000, targetPrice: 15000, timeLeft: 0, endDate: '2026-02-01', lastBidder: { name: 'سعيد الجابر', isAi: true } },
    { id: 53, countryCode: 'AE', status: 'completed', name: 'قلم Montblanc محدود', officialPrice: 6000, img: 'https://images.unsplash.com/photo-1585336139118-b31b7f0b5030?q=80&w=500', currentBid: 4500, targetPrice: 4500, timeLeft: 0, endDate: '2026-01-10', lastBidder: { name: 'منصور', isAi: false } },

    // ================== الكويت KW ==================
    { id: 7, countryCode: 'KW', status: 'active', name: 'Dyson V15 Detect', officialPrice: 75000, img: 'https://picsum.photos/id/192/600/400', startPrice: 250, currentBid: 2100, targetPrice: 3500, totalPoints: 4000, timeLeft: 5400, lastBidder: { name: 'البوت الذكي', isAi: true, time: '5 ثوانٍ' } },
    { id: 12, countryCode: 'KW', status: 'active', name: 'Nintendo Switch OLED', officialPrice: 75000, img: 'https://picsum.photos/id/180/600/400', startPrice: 100, currentBid: 1200, targetPrice: 1800, totalPoints: 2000, timeLeft: 8000, lastBidder: { name: 'خالد السالم', isAi: false, time: '15 ثانية' } },
    { id: 13, countryCode: 'KW', status: 'active', name: 'Sony WH-1000XM5', officialPrice: 75000, img: 'https://picsum.photos/id/212/600/400', startPrice: 150, currentBid: 1850, targetPrice: 2200, totalPoints: 2500, timeLeft: 4300, lastBidder: { name: 'البوت الذكي', isAi: true, time: 'لحظة' } },
    { id: 19, countryCode: 'KW', status: 'active', name: 'قهوة Breville Oracle', officialPrice: 75000, img: 'https://picsum.photos/id/103/600/400', startPrice: 800, currentBid: 6200, targetPrice: 9000, totalPoints: 8500, timeLeft: 32000, lastBidder: { name: 'نواف العنزي', isAi: false, time: 'دقيقة' } },
    { id: 8, countryCode: 'KW', status: 'active', name: 'Gaming PC RTX 4090', officialPrice: 2500, img: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=500', currentBid: 1800, targetPrice: 2200, timeLeft: 12000, lastBidder: { name: 'مبارك', isAi: false } },
    { id: 17, countryCode: 'KW', status: 'active', name: 'سماعات Bose QC', officialPrice: 160, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=500', currentBid: 95, targetPrice: 130, timeLeft: 5400, lastBidder: { name: 'مشعل', isAi: true } },
    { id: 30, countryCode: 'KW', status: 'active', name: 'ماكينة La Marzocco', officialPrice: 1800, img: 'https://images.unsplash.com/photo-1510525944062-1d54be2e4822?q=80&w=500', currentBid: 1200, targetPrice: 1550, timeLeft: 43200, lastBidder: { name: 'فهد المطيري', isAi: false } },
    { id: 54, countryCode: 'KW', status: 'active', name: 'كرسي Herman Miller', officialPrice: 600, img: 'https://images.unsplash.com/photo-1592074791365-c2611527501f?q=80&w=500', currentBid: 350, targetPrice: 450, timeLeft: 21600, lastBidder: { name: 'جراح', isAi: false } },
    { id: 55, countryCode: 'KW', status: 'active', name: 'كاميرا Fujifilm X100V', officialPrice: 850, img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=500', currentBid: 550, targetPrice: 700, timeLeft: 3600, lastBidder: { name: 'ناصر', isAi: false } },
    { id: 64, countryCode: 'KW', status: 'active', name: 'مجموعة بخور القرشي', officialPrice: 450, img: 'https://images.unsplash.com/photo-1595131838595-3154b9f4450b?q=80&w=500', currentBid: 280, targetPrice: 400, timeLeft: 12000, lastBidder: { name: 'بدر', isAi: false } },
    { id: 18, countryCode: 'KW', status: 'upcoming', name: 'عطور فرنسية', officialPrice: 350, img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=500', currentBid: 0, targetPrice: 250, timeLeft: 0, startDate: '2026-03-12', lastBidder: { name: '-', isAi: false } },
    { id: 31, countryCode: 'KW', status: 'upcoming', name: 'iPhone SE Limited', officialPrice: 220, img: 'https://images.unsplash.com/photo-1592750475338-74575a4955ff?q=80&w=500', currentBid: 0, targetPrice: 180, timeLeft: 0, startDate: '2026-04-10', lastBidder: { name: '-', isAi: false } },
    { id: 32, countryCode: 'KW', status: 'completed', name: 'ساعة ابل الترا 2', officialPrice: 320, img: 'https://images.unsplash.com/photo-1434493907317-a46b5bc78344?q=80&w=500', currentBid: 280, targetPrice: 280, timeLeft: 0, endDate: '2026-02-18', lastBidder: { name: 'غانم', isAi: false } },
    { id: 56, countryCode: 'KW', status: 'completed', name: 'سوني A7C', officialPrice: 750, img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=500', currentBid: 600, targetPrice: 600, timeLeft: 0, endDate: '2026-01-10', lastBidder: { name: 'يوسف', isAi: false } },

    // ================== قطر QA ==================
    { id: 8, countryCode: 'QA', status: 'active', name: 'Canon EOS R5', officialPrice: 75000, img: 'https://picsum.photos/id/251/600/400', startPrice: 1500, currentBid: 18000, targetPrice: 25000, totalPoints: 22000, timeLeft: 72000, lastBidder: { name: 'فهد الكواري', isAi: false, time: '30 ثانية' } },
    { id: 14, countryCode: 'QA', status: 'active', name: 'Alienware m18 Laptop', officialPrice: 75000, img: 'https://picsum.photos/id/161/600/400', startPrice: 2000, currentBid: 21000, targetPrice: 28000, totalPoints: 26000, timeLeft: 95000, lastBidder: { name: 'البوت الذكي', isAi: true, time: '4 ثوانٍ' } },
    { id: 15, countryCode: 'QA', status: 'active', name: 'Asus ROG Ally', officialPrice: 75000, img: 'https://picsum.photos/id/101/600/400', startPrice: 300, currentBid: 2400, targetPrice: 3500, totalPoints: 3200, timeLeft: 11000, lastBidder: { name: 'تميم جاسم', isAi: false, time: 'ثانية' } },
    { id: 20, countryCode: 'QA', status: 'active', name: 'هاتف Fold 5 Special', officialPrice: 75000, img: 'https://picsum.photos/id/104/600/400', startPrice: 400, currentBid: 5800, targetPrice: 7500, totalPoints: 6900, timeLeft: 15000, lastBidder: { name: 'البوت الذكي', isAi: true, time: 'لحظة' } },
    { id: 19, countryCode: 'QA', status: 'active', name: 'مضرب بادل احترافي', officialPrice: 2200, img: 'https://images.unsplash.com/photo-1617083277661-75053e15566f?q=80&w=500', currentBid: 1200, targetPrice: 1800, timeLeft: 86400, lastBidder: { name: 'تميم', isAi: false } },
    { id: 20, countryCode: 'QA', status: 'active', name: 'سكوتر Xiaomi', officialPrice: 3500, img: 'https://images.unsplash.com/photo-1595180635489-08573199c43d?q=80&w=500', currentBid: 2100, targetPrice: 2800, timeLeft: 21600, lastBidder: { name: 'جاسم', isAi: false } },
    { id: 33, countryCode: 'QA', status: 'active', name: 'Surface Laptop 7', officialPrice: 9500, img: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=500', currentBid: 6500, targetPrice: 8000, timeLeft: 15000, lastBidder: { name: 'ناصر الخليفي', isAi: false } },
    { id: 57, countryCode: 'QA', status: 'active', name: 'نظارة Apple Vision Pro', officialPrice: 18000, img: 'https://images.unsplash.com/photo-1626218174358-77b7f9dd98b9?q=80&w=500', currentBid: 13500, targetPrice: 16000, timeLeft: 43200, lastBidder: { name: 'فاطمة', isAi: false } },
    { id: 58, countryCode: 'QA', status: 'active', name: 'طاولة بلياردو فاخرة', officialPrice: 18000, img: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=500', currentBid: 12000, targetPrice: 15000, timeLeft: 172800, lastBidder: { name: 'طلال', isAi: true } },
    { id: 65, countryCode: 'QA', status: 'active', name: 'تلفزيون LG C3 77"', officialPrice: 15000, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=500', currentBid: 11000, targetPrice: 14000, timeLeft: 50000, lastBidder: { name: 'موزة', isAi: false } },
    { id: 9, countryCode: 'QA', status: 'upcoming', name: 'Nikon Z8 Camera', officialPrice: 24000, img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=500', currentBid: 0, targetPrice: 20000, timeLeft: 0, startDate: '2026-04-15', lastBidder: { name: '-', isAi: false } },
    { id: 34, countryCode: 'QA', status: 'upcoming', name: 'تذاكر VIP مونديال', officialPrice: 20000, img: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=500', currentBid: 0, targetPrice: 15000, timeLeft: 0, startDate: '2026-05-01', lastBidder: { name: '-', isAi: false } },
    { id: 59, countryCode: 'QA', status: 'upcoming', name: 'ساعة Cartier Tank', officialPrice: 45000, img: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=500', currentBid: 0, targetPrice: 35000, timeLeft: 0, startDate: '2026-06-01', lastBidder: { name: '-', isAi: false } },
    { id: 35, countryCode: 'QA', status: 'completed', name: 'عطر الفارس', officialPrice: 1800, img: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=500', currentBid: 1200, targetPrice: 1200, timeLeft: 0, endDate: '2026-01-15', lastBidder: { name: 'حمد', isAi: true } },
    { id: 60, countryCode: 'QA', status: 'completed', name: 'درع تذكاري مذهب', officialPrice: 7000, img: 'https://images.unsplash.com/photo-1610375461246-83df82444002?q=80&w=500', currentBid: 5000, targetPrice: 5000, timeLeft: 0, endDate: '2026-02-01', lastBidder: { name: 'خليفة', isAi: false } },
]);


  filteredList = computed(() => {
    const country = this.selectedCountry().code;
    const filter = this.currentFilter();
    return this.allAuctions().filter(item =>
      item.countryCode === country && item.status === filter
    );
  });

  constructor() {
    effect(() => {
      const interval = setInterval(() => {
        const stored = this.getCountryFromStorage();
        if (JSON.stringify(stored) !== JSON.stringify(this.selectedCountry())) {
          this.selectedCountry.set(stored);
        }
      }, 1000);
      return () => clearInterval(interval);
    });
  }

  ngOnInit(): void {
    this.startCountdown();
  }

  private getCountryFromStorage() {
    const data = localStorage.getItem('selected_country');
    return data ? JSON.parse(data) : { name: 'مصر', code: 'EG', currency: 'ج.م' };
  }

  setFilter(filter: 'active' | 'upcoming' | 'completed') {
    this.currentFilter.set(filter);
    this.itemsToShow.set(4);
  }

  loadMore() {
    this.itemsToShow.update(v => v + 4);
  }


openAddModal() {
    this.isEditMode = false;
    this.showAddModal = true;
    this.imagePreview = null;
    this.newAuctionObj = {
        name: '',
        date: '',
        hours: 24,
        startPoints: 0,
        targetPoints: 0,
        officialPrice: 0,
        img: ''
    };
  }

openEditModal(item: any) {
    this.selectedItem = item;
    this.isEditMode = true;
    this.newAuctionObj = {
      name: item.name,
      date: item.startDate || '',
      hours: item.timeLeft ? Math.floor(item.timeLeft / 3600) : 24,
      startPoints: item.currentBid,
      targetPoints: item.targetPrice,
      officialPrice: item.officialPrice || 0,
      img: item.img
    };
    this.imagePreview = item.img;
  }

  closeModal() {
    this.showAddModal = false;
    this.isEditMode = false;
  }

submitNewAuction() {
    const newItem = {
      id: Date.now(),
      countryCode: this.selectedCountry().code,
      status: 'upcoming' as const,
      name: this.newAuctionObj.name,
      officialPrice: this.newAuctionObj.officialPrice, // حفظ السعر الرسمي
      img: this.imagePreview || 'https://via.placeholder.com/300',
      currentBid: this.newAuctionObj.startPoints,
      targetPrice: this.newAuctionObj.targetPoints,
      timeLeft: this.newAuctionObj.hours * 3600,
      lastBidder: { name: '-', isAi: false },
      startDate: this.newAuctionObj.date
    };

    this.allAuctions.update(prev => [newItem, ...prev]);
    this.closeModal();
    this.setFilter('upcoming');
  }


saveChanges() {
  if (!this.selectedItem) return;

  this.allAuctions.update(prev => prev.map(item =>
    item.id === this.selectedItem.id
    ? {
        ...item,
        name: this.newAuctionObj.name,
        officialPrice: this.newAuctionObj.officialPrice, // <-- تحديث السعر الرسمي
        targetPrice: this.newAuctionObj.targetPoints,
        startDate: this.newAuctionObj.date, // <-- تحديث تاريخ البدء
        timeLeft: this.newAuctionObj.hours * 3600, // <-- تحديث المدة
        img: this.imagePreview || item.img
      }
    : item
  ));
  this.closeModal();
}

  startCountdown() {
    this.timerInterval = setInterval(() => {
      this.allAuctions.update(items => items.map(item => {
        if (item.status === 'active' && item.timeLeft > 0) {
          return { ...item, timeLeft: item.timeLeft - 1 };
        }
        return item;
      }));
    }, 1000);
  }

  getTimeParts(seconds: number) {
    if (seconds <= 0) return { d: 0, h: '00', m: '00', s: '00' };
    return {
      d: Math.floor(seconds / 86400),
      h: this.pad(Math.floor((seconds % 86400) / 3600)),
      m: this.pad(Math.floor((seconds % 3600) / 60)),
      s: this.pad(seconds % 60)
    };
  }

  private pad(n: any) { return n < 10 ? `0${n}` : n; }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  removeImage() { this.imagePreview = null; }

  ngOnDestroy() { if (this.timerInterval) clearInterval(this.timerInterval); }
}
