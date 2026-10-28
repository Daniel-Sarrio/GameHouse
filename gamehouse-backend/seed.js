require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = require('./src/config/database');
const generateSlug = require('./src/services/utils/slug');
const generateSku = require('./src/services/utils/sku');

// Los datos de prueba respetan la actividad de sus dependencias sin reactivarlas.
const eventCanBeActive = async (client, experienceId, categoryId) => {
  const result = await client.query(`SELECT e.is_active AND h.is_active AND c.is_active
    AND e.deleted_at IS NULL AND h.deleted_at IS NULL AND c.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM experience_categories ec
      WHERE ec.experience_id = e.id AND ec.category_id = c.id AND ec.deleted_at IS NULL) AS active
    FROM experiences e JOIN hosts h ON h.id = e.host_id CROSS JOIN categories c
    WHERE e.id = $1 AND c.id = $2`, [experienceId, categoryId]);
  return result.rows[0]?.active ?? false;
};

const hosts = [
  'Equipo GameHouse',
  'Pixel Masters',
  'VR Valencia',
  'Escape Lab',
];

const locations = [
  { name: 'GameHouse Arena', city: 'Valencia', country: 'España' },
  { name: 'GameHouse Social Club', city: 'Valencia', country: 'España' },
  { name: 'GameHouse VR Lab', city: 'Valencia', country: 'España' },
  { name: 'Pixel Hub Madrid', city: 'Madrid', country: 'España' },
  { name: 'Escape Lab Barcelona', city: 'Barcelona', country: 'España' },
];

const categories = ['Torneos', 'Realidad Virtual', 'Simuladores', 'Gaming', 'Escape Rooms'];
const roles = ['ADMIN', 'HOST', 'USER'];

const events = [
  {
    name: 'Torneo de videojuegos', slug: 'torneo-de-videojuegos',
    description: 'Compite con otros jugadores en un torneo presencial con varias rondas y premios.',
    host: 'Equipo GameHouse', location: 'GameHouse Arena', categories: ['Torneos', 'Gaming'],
    price: 10, duration: 120, capacity: 16, status: 'published',
    image: 'gamehouse-torneo',
  },
  {
    name: 'Noche de juegos de mesa', slug: 'noche-de-juegos-de-mesa',
    description: 'Descubre nuevos juegos de mesa con explicación de reglas y partidas organizadas en grupo.',
    host: 'Equipo GameHouse', location: 'GameHouse Social Club', categories: ['Gaming'],
    price: 5, duration: 90, capacity: 12, status: 'published',
    image: 'gamehouse-mesa',
  },
  {
    name: 'Experiencia de realidad virtual', slug: 'experiencia-de-realidad-virtual',
    description: 'Explora aventuras inmersivas de realidad virtual con equipos preparados y ayuda del personal.',
    host: 'VR Valencia', location: 'GameHouse VR Lab', categories: ['Realidad Virtual', 'Gaming'],
    price: 15, duration: 60, capacity: 8, status: 'published',
    image: 'gamehouse-vr',
  },
  {
    name: 'Campeonato de lucha arcade', slug: 'campeonato-de-lucha-arcade',
    description: 'Demuestra tus reflejos en un campeonato arcade con eliminatorias y final presencial.',
    host: 'Pixel Masters', location: 'Pixel Hub Madrid', categories: ['Torneos', 'Gaming'],
    price: 12, duration: 180, capacity: 32, status: 'published',
    image: 'gamehouse-arcade',
  },
  {
    name: 'Carreras en simulador profesional', slug: 'carreras-en-simulador-profesional',
    description: 'Conduce en circuitos virtuales con volante, pedales y clasificación por tiempos.',
    host: 'Equipo GameHouse', location: 'GameHouse Arena', categories: ['Simuladores', 'Gaming'],
    price: 18, duration: 75, capacity: 10, status: 'published',
    image: 'gamehouse-racing',
  },
  {
    name: 'Misión de escape tecnológico', slug: 'mision-de-escape-tecnologico',
    description: 'Resuelve acertijos digitales en equipo para completar una misión contrarreloj.',
    host: 'Escape Lab', location: 'Escape Lab Barcelona', categories: ['Escape Rooms'],
    price: 22, duration: 60, capacity: 6, status: 'published',
    image: 'gamehouse-escape',
  },
  {
    name: 'Aventura cooperativa en realidad virtual', slug: 'aventura-cooperativa-en-realidad-virtual',
    description: 'Forma un equipo y supera desafíos inmersivos en una aventura cooperativa virtual.',
    host: 'VR Valencia', location: 'GameHouse VR Lab', categories: ['Realidad Virtual', 'Escape Rooms'],
    price: 25, duration: 90, capacity: 4, status: 'published',
    image: 'gamehouse-vr-coop',
  },
  {
    name: 'Taller de creación de videojuegos', slug: 'taller-de-creacion-de-videojuegos',
    description: 'Aprende los fundamentos del diseño de videojuegos y crea un prototipo jugable.',
    host: 'Pixel Masters', location: 'Pixel Hub Madrid', categories: ['Gaming'],
    price: 20, duration: 150, capacity: 14, status: 'draft',
    image: 'gamehouse-taller',
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const name of roles) await client.query(
      'INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    for (const name of hosts) await client.query(
      'INSERT INTO hosts (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, generateSlug(name)]);
    for (const { name, city, country } of locations) await client.query(
      'INSERT INTO locations (name, city, country) VALUES ($1, $2, $3) ON CONFLICT (name, city, country) DO NOTHING',
      [name, city, country]);
    for (const name of categories) await client.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, generateSlug(name)]);

    const hostRows = (await client.query('SELECT id, name, is_active, deleted_at FROM hosts WHERE deleted_at IS NULL')).rows;
    const locationRows = (await client.query('SELECT id, name FROM locations WHERE deleted_at IS NULL')).rows;
    const categoryRows = (await client.query('SELECT id, name FROM categories WHERE deleted_at IS NULL')).rows;
    for (const [entityType, rows] of [['hosts', hostRows], ['locations', locationRows], ['categories', categoryRows]]) {
      for (const row of rows) {
        const imageUrl = 'https://picsum.photos/seed/gamehouse-' + entityType + '-' + row.id + '/800/600';
        await client.query('UPDATE ' + entityType + ' SET image_url = $1 WHERE id = $2 AND image_url IS NULL', [imageUrl, row.id]);
      }
    }
    let createdExperiences = 0;
    let createdEvents = 0;
    for (const [index, item] of events.entries()) {
      const host = hostRows.find((row) => row.name === item.host);
      const location = locationRows.find((row) => row.name === item.location);
      const categoryIds = item.categories.map((name) => categoryRows.find((row) => row.name === name)?.id);
      if (!host || !location || categoryIds.some((id) => !id)) continue;
      const imageUrl = 'https://picsum.photos/seed/' + item.image + '/1200/800';
      const inserted = await client.query(
        'INSERT INTO experiences (name, slug, description, image_url, host_id, status, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (slug) DO NOTHING RETURNING id',
        [item.name, item.slug, item.description, imageUrl, host.id, item.status, host.is_active && !host.deleted_at]);
      if (inserted.rowCount) createdExperiences++;
      const experience = inserted.rows[0] || (await client.query('SELECT id FROM experiences WHERE slug = $1 AND deleted_at IS NULL', [item.slug])).rows[0];
      if (!experience) continue;
      for (const categoryId of categoryIds) await client.query(
        'INSERT INTO experience_categories (experience_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [experience.id, categoryId]);
      const start = new Date(Date.UTC(2026, 10, 20 + index, 18, 0));
      const end = new Date(start.getTime() + item.duration * 60000);
      const startText = start.toISOString().slice(0, 19);
      const endText = end.toISOString().slice(0, 19);
      const event = await client.query(
        'INSERT INTO events (experience_id, location_id, category_id, start_datetime, end_datetime, price, capacity, status, image_url, sku, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING RETURNING id',
        [experience.id, location.id, categoryIds[0], startText, endText, item.price, item.capacity, 'scheduled', imageUrl,
          generateSku(`${item.name}-${location.id}-${startText}`), await eventCanBeActive(client, experience.id, categoryIds[0])]);
      if (event.rowCount) createdEvents++;
    }
    // El mismo torneo se celebra dos veces con precio y capacidad distintos.
    const fc = (await client.query("SELECT id, name FROM experiences WHERE slug IN ('torneo-fc27', 'torneo-de-fc27') AND deleted_at IS NULL ORDER BY id LIMIT 1")).rows[0];
    if (fc) {
      const location = locationRows.find((row) => row.name === 'GameHouse Arena');
      const category = categoryRows.find((row) => row.name === 'Torneos');
      if (location && category) for (const [start, end, price, capacity] of [
        ['2026-11-20T18:00:00', '2026-11-20T21:00:00', 15, 32],
        ['2026-12-05T17:00:00', '2026-12-05T20:00:00', 20, 64],
      ]) {
        const result = await client.query(
          'INSERT INTO events (experience_id, location_id, category_id, start_datetime, end_datetime, price, capacity, status, sku, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING RETURNING id',
          [fc.id, location.id, category.id, start, end, price, capacity, 'scheduled', generateSku(`${fc.name}-${location.id}-${start}`), await eventCanBeActive(client, fc.id, category.id)]);
        if (result.rowCount) createdEvents++;
      }
    }
    await client.query('COMMIT');
    console.log('Seed completado: ' + createdExperiences + ' experiencias y ' + createdEvents + ' eventos nuevos.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error durante el seed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
seed();
