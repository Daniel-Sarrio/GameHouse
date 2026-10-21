import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideLayers, LucideTags, LucideUsers, LucideMapPin, LucideShield, LucideCalendarDays } from '@lucide/angular';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideLayers, LucideTags, LucideUsers, LucideMapPin, LucideShield, LucideCalendarDays],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {}
