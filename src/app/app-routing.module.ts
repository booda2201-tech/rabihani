import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { HomeComponent } from './components/home/home.component';
import { ProductDetailsComponent } from './components/product-details/product-details.component';
import { AuctionsComponent } from './components/auctions/auctions.component';
import { AdvertisementsComponent } from './components/advertisements/advertisements.component';
import { CountriesComponent } from './components/countries/countries.component';
import { CompaniesComponent } from './components/companies/companies.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'products', component: ProductListComponent },
      { path: 'auctions', component: AuctionsComponent },
      { path: 'product-details/:id', component: ProductDetailsComponent },
      { path: 'ads', component: AdvertisementsComponent },
      { path: 'count', component: CountriesComponent },
      { path: 'comp', component: CompaniesComponent },

    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
