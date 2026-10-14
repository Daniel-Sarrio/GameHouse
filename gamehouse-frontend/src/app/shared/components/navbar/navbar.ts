import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideLayoutDashboard, LucideLayers, LucidePlus } from '@lucide/angular';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideLayoutDashboard, LucideLayers, LucidePlus],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {}
