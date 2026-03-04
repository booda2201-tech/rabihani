import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  baseUrl: string = 'http://alhendalcompany-001-site7.stempurl.com/api';

  constructor(private http: HttpClient) { }

  // --- المنتجات (Products) ---

  getProducts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Products`);
  }

  addProduct(productData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Products`, productData);
  }

  updateProduct(id: number, productData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/Products/${id}`, productData);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Products/${id}`);
  }

  // --- الأقسام (Categories) ---

  getCategories(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Categories`);
  }

  addCategory(categoryData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Categories`, categoryData);
  }

  updateCategory(id: number, categoryData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/Categories/${id}`, categoryData);
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Categories/${id}`);
  }


  // --- الإعلانات (Advertisements) ---

  getAdvertisements(): Observable<any> {
    return this.http.get(`${this.baseUrl}/Advertisements`);
  }
  getAdvertisementById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/Advertisements/${id}`);
  }
  addAdvertisement(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/Advertisements`, data);
  }
  deleteAdvertisement(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Advertisements/${id}`);
  }

  // --- الدول (Countries) ---

  getCountries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Countries`);
  }

  addCountry(country: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Countries`, country);
  }

  updateCountry(id: number, country: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/Countries/${id}`, country);
  }

  deleteCountry(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Countries/${id}`);
  }

  // --- الشركات (Companies) ---

  getCompanies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Companies`);
  }

  getCompanyById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/Companies/${id}`);
  }

  addCompany(companyData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/Companies`, companyData);
  }

  updateCompany(id: number, companyData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/Companies/${id}`, companyData);
  }

  deleteCompany(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Companies/${id}`);
  }

  // --- غرف المزاد (Auction Rooms) ---

  getActiveAuctionRooms(countryId?: number, categoryId?: number): Observable<any> {
    let params = new HttpParams();

    if (countryId) {
      params = params.set('countryId', countryId.toString());
    }
    if (categoryId) {
      params = params.set('categoryId', categoryId.toString());
    }

    return this.http.get(`${this.baseUrl}/AuctionRooms/active`, { params });
  }

  postAuction(data: any) {
    return this.http.post(`${this.baseUrl}/AuctionRooms`, data);
  }

  updateAuctionRoom(id: any, data: any) {
    return this.http.put(`${this.baseUrl}/AuctionRooms/${id}`, data);
  }

  // ---  كل غرف المزاد مع الفلترة ---

  getAuctionRooms(countryId?: number, categoryId?: number): Observable<any> {
    let params = new HttpParams();

    if (countryId) {
      params = params.set('countryId', countryId.toString());
    }
    if (categoryId) {
      params = params.set('categoryId', categoryId.toString());
    }


    return this.http.get(`${this.baseUrl}/AuctionRooms`, { params });
  }

    // --- غرف المزاد (Auction id) ---
    getAuctionRoomById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/AuctionRooms/${id}`);
  }

}









