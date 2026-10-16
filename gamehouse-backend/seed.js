require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = require('./src/config/database');

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

    for (const name of hosts) {
      await client.query('INSERT INTO hosts (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }
    for (const { name, city, country } of locations) {
      await client.query(`INSERT INTO locations (name, city, country) VALUES ($1, $2, $3)
        ON CONFLICT (name, city, country) DO NOTHING`, [name, city, country]);
    }
    for (const name of categories) {
      await client.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
    }

    const hostRows = (await client.query('SELECT id, name FROM hosts')).rows;
    const locationRows = (await client.query('SELECT id, name, city, country FROM locations')).rows;
    const categoryRows = (await client.query('SELECT id, name FROM categories')).rows;
    for (const [entityType, rows] of [
      ['hosts', hostRows], ['locations', locationRows], ['categories', categoryRows],
    ]) {
      for (const row of rows) {
        const imageUrl = `https://picsum.photos/seed/gamehouse-${entityType}-${row.id}/800/600`;
        await client.query(`INSERT INTO images (entity_type, entity_id, url, is_main, position)
          VALUES ($1, $2, $3, TRUE, 0)
          ON CONFLICT (entity_type, entity_id, position) DO NOTHING`,
        [entityType, row.id, imageUrl]);
        if (entityType === 'locations') {
          await client.query('UPDATE locations SET image_url = $1 WHERE id = $2 AND image_url IS NULL',
            [imageUrl, row.id]);
        }
      }
    }
    const results = [];

    for (const event of events) {
      const host = hostRows.find((row) => row.name === event.host);
      const location = locationRows.find((row) => row.name === event.location);
      const categoryIds = event.categories.map((name) => categoryRows.find((row) => row.name === name)?.id);
      if (!host || !location || categoryIds.some((id) => !id)) {
        throw new Error(`Falta un dato de referencia para ${event.name}.`);
      }

      const coverImage = `https://picsum.photos/seed/${event.image}/1200/800`;
      const gallery = [
        `https://picsum.photos/seed/${event.image}-1/1200/800`,
        `https://picsum.photos/seed/${event.image}-2/1200/800`,
      ];
      const inserted = await client.query(`INSERT INTO experiences (
        name, slug, description, location, country, city, price, currency,
        duration, capacity, cover_image, gallery, host_name, host_id, location_id,
        status, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'EUR',$8,$9,$10,$11,$12,$13,$14,$15,TRUE)
      ON CONFLICT (slug) DO NOTHING RETURNING id`, [
        event.name, event.slug, event.description, location.name, location.country,
        location.city, event.price, event.duration, event.capacity, coverImage,
        gallery, host.name, host.id, location.id, event.status,
      ]);

      if (inserted.rowCount) {
        await client.query(`INSERT INTO experience_categories (experience_id, category_id)
          SELECT $1, unnest($2::int[])`, [inserted.rows[0].id, categoryIds]);
      }
      results.push({ name: event.name, result: inserted.rowCount ? 'creado' : 'ya existía' });
    }

    await client.query('COMMIT');
    console.table(results);
    console.log(`Seed completado: ${results.filter((item) => item.result === 'creado').length} eventos creados, ${results.filter((item) => item.result === 'ya existía').length} existentes.`);
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
