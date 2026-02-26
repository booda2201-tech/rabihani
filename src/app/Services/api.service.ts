import { HttpClient } from '@angular/common/http';
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


}









