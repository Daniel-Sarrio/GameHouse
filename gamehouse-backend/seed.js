require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = require('./src/config/database');
const experiencesService = require('./src/services/experiences.service');

const events = [
  {
    name: 'Torneo de videojuegos',
    slug: 'torneo-de-videojuegos',
    description: 'Compite con otros jugadores en un torneo presencial con varias rondas y premios.',
    location: 'GameHouse Arena',
    country: 'España',
    city: 'Valencia',
    price: 10,
    currency: 'EUR',
    duration: 120,
    capacity: 16,
    coverImage: 'https://picsum.photos/seed/gamehouse-torneo/1200/800',
    gallery: ['https://picsum.photos/seed/gamehouse-torneo-1/1200/800'],
    hostName: 'Equipo GameHouse',
    status: 'published',
    isActive: true,
  },
  {
    name: 'Noche de juegos de mesa',
    slug: 'noche-de-juegos-de-mesa',
    description: 'Descubre nuevos juegos de mesa con explicación de reglas y partidas organizadas en grupo.',
    location: 'GameHouse Social Club',
    country: 'España',
    city: 'Valencia',
    price: 5,
    currency: 'EUR',
    duration: 90,
    capacity: 12,
    coverImage: 'https://picsum.photos/seed/gamehouse-mesa/1200/800',
    gallery: ['https://picsum.photos/seed/gamehouse-mesa-1/1200/800'],
    hostName: 'Equipo GameHouse',
    status: 'published',
    isActive: true,
  },
  {
    name: 'Experiencia de realidad virtual',
    slug: 'experiencia-de-realidad-virtual',
    description: 'Explora aventuras inmersivas de realidad virtual con equipos preparados y ayuda del personal.',
    location: 'GameHouse VR Lab',
    country: 'España',
    city: 'Valencia',
    price: 15,
    currency: 'EUR',
    duration: 60,
    capacity: 8,
    coverImage: 'https://picsum.photos/seed/gamehouse-vr/1200/800',
    gallery: ['https://picsum.photos/seed/gamehouse-vr-1/1200/800'],
    hostName: 'Equipo GameHouse',
    status: 'published',
    isActive: true,
  },
];

async function seed() {
  try {
    const created = [];
    for (const event of events) created.push(await experiencesService.createExperience(event));
    console.log('Se han creado 3 eventos de prueba:');
    console.table(created.map(({ id, name, slug }) => ({ id, name, slug })));
  } catch (error) {
    console.error('Error al crear los eventos de prueba:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
