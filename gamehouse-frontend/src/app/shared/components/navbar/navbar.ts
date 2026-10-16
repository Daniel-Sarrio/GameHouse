import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideLayers } from '@lucide/angular';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideLayers],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {}
