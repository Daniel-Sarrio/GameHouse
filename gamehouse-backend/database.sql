-- Ejecutar sobre una base de datos PostgreSQL vacía.
-- Una experience es reutilizable; cada event es una celebración concreta.
BEGIN;

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hosts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    phone VARCHAR(30),
    email VARCHAR(255) UNIQUE,
    image_url TEXT
);

CREATE TABLE experiences (
    id SERIAL PRIMARY KEY,
    host_id INTEGER NOT NULL REFERENCES hosts(id),
    name VARCHAR(180) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    image_url TEXT
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    experience_id INTEGER NOT NULL REFERENCES experiences(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT events_end_after_start CHECK (end_datetime > start_datetime)
);

-- Las imágenes se asocian a cualquier tabla por nombre e ID de su registro.
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL CHECK (entity_type ~ '^[a-z][a-z0-9_]*$'),
    entity_id INTEGER NOT NULL CHECK (entity_id > 0),
    url TEXT NOT NULL CHECK (length(trim(url)) > 0),
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_type, entity_id, position)
);

CREATE UNIQUE INDEX images_one_main_per_entity
    ON images (entity_type, entity_id) WHERE is_main;
CREATE INDEX images_entity_lookup
    ON images (entity_type, entity_id, position);

INSERT INTO roles (name) VALUES
    ('ADMIN'),
    ('HOST'),
    ('USER');

INSERT INTO categories (name, description, image_url) VALUES
    ('Torneos', 'Competiciones presenciales de videojuegos.', 'https://picsum.photos/seed/gamehouse-torneos/800/600'),
    ('Realidad Virtual', 'Experiencias inmersivas de realidad virtual.', 'https://picsum.photos/seed/gamehouse-vr/800/600'),
    ('Simuladores', 'Experiencias de simulación.', 'https://picsum.photos/seed/gamehouse-simuladores/800/600'),
    ('Gaming', 'Actividades relacionadas con videojuegos.', 'https://picsum.photos/seed/gamehouse-gaming/800/600'),
    ('Escape Rooms', 'Juegos de escape en equipo.', 'https://picsum.photos/seed/gamehouse-escape/800/600');

-- La contraseña de ejemplo es un marcador no utilizable: reemplazar por un hash antes de habilitar acceso.
INSERT INTO users (role_id, name, surname, email, password, phone)
VALUES (
    (SELECT id FROM roles WHERE name = 'HOST'),
    'Lucía', 'García', 'lucia.host@example.com',
    'REPLACE_WITH_PASSWORD_HASH', '+34600000001'
);

INSERT INTO hosts (user_id, name, description, phone, email, image_url)
VALUES (
    (SELECT id FROM users WHERE email = 'lucia.host@example.com'),
    'GameHouse Eventos', 'Organizador de experiencias de gaming.',
    '+34600000002', 'eventos@example.com',
    'https://picsum.photos/seed/gamehouse-host/800/600'
);

INSERT INTO experiences (host_id, name, description, image_url)
VALUES (
    (SELECT id FROM hosts WHERE email = 'eventos@example.com'),
    'Torneo FC27', 'Torneo presencial de FC27 con varias rondas y premios.',
    'https://picsum.photos/seed/gamehouse-fc27/1200/800'
);

INSERT INTO locations (name, address, city, postal_code, image_url) VALUES
    ('GameHouse Arena Valencia', 'Calle del Juego 10', 'Valencia', '46001',
     'https://picsum.photos/seed/gamehouse-arena-valencia/800/600');

INSERT INTO events (
    experience_id, location_id, category_id, start_datetime, end_datetime,
    price, capacity, status, image_url
) VALUES
    (
        (SELECT id FROM experiences WHERE name = 'Torneo FC27'),
        (SELECT id FROM locations WHERE name = 'GameHouse Arena Valencia'),
        (SELECT id FROM categories WHERE name = 'Torneos'),
        '2026-11-20 18:00:00', '2026-11-20 21:00:00',
        15.00, 32, 'scheduled',
        'https://picsum.photos/seed/gamehouse-fc27-valencia/1200/800'
    ),
    (
        (SELECT id FROM experiences WHERE name = 'Torneo FC27'),
        (SELECT id FROM locations WHERE name = 'GameHouse Arena Valencia'),
        (SELECT id FROM categories WHERE name = 'Torneos'),
        '2026-12-05 17:00:00', '2026-12-05 20:00:00',
        20.00, 64, 'scheduled',
        'https://picsum.photos/seed/gamehouse-fc27-diciembre/1200/800'
    );

INSERT INTO images (entity_type, entity_id, url, is_main, position) VALUES
    (
        'events',
        (SELECT id FROM events WHERE start_datetime = '2026-11-20 18:00:00'),
        'https://picsum.photos/seed/gamehouse-fc27-valencia/1200/800',
        TRUE, 0
    ),
    (
        'events',
        (SELECT id FROM events WHERE start_datetime = '2026-11-20 18:00:00'),
        'https://picsum.photos/seed/gamehouse-fc27-valencia-galeria/1200/800',
        FALSE, 1
    ),
    (
        'events',
        (SELECT id FROM events WHERE start_datetime = '2026-12-05 17:00:00'),
        'https://picsum.photos/seed/gamehouse-fc27-diciembre/1200/800',
        TRUE, 0
    ),
    (
        'events',
        (SELECT id FROM events WHERE start_datetime = '2026-12-05 17:00:00'),
        'https://picsum.photos/seed/gamehouse-fc27-diciembre-galeria/1200/800',
        FALSE, 1
    );

COMMIT;
