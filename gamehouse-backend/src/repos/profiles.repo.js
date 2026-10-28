const pool = require('../config/database');
const Profile = require('../models/profile.model');
const columns = 'id, user_id, first_name, last_name, phone, avatar_url, created_at, updated_at';
const toProfile = (row) => row ? new Profile(row) : null;

module.exports = {
  findById: async (id) => toProfile((await pool.query(`SELECT ${columns} FROM profiles WHERE id = $1`, [id])).rows[0]),
  findByUserId: async (userId, client = pool) => toProfile((await client.query(`SELECT ${columns} FROM profiles WHERE user_id = $1`, [userId])).rows[0]),
  create: async (client, userId, data) => toProfile((await client.query(
    `INSERT INTO profiles (user_id, first_name, last_name, phone, avatar_url)
     VALUES ($1,$2,$3,$4,$5) RETURNING ${columns}`,
    [userId, data.firstName ?? null, data.lastName ?? null, data.phone ?? null, data.avatarUrl ?? null],
  )).rows[0]),
  update: async (id, data, client = pool) => {
    const fields = { firstName: 'first_name', lastName: 'last_name', phone: 'phone', avatarUrl: 'avatar_url' };
    const entries = Object.entries(data).filter(([key]) => Object.hasOwn(fields, key));
    const assignments = entries.map(([key], i) => `${fields[key]} = $${i + 1}`);
    return toProfile((await client.query(
      `UPDATE profiles SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${entries.length + 1} RETURNING ${columns}`,
      [...entries.map(([, value]) => value), id],
    )).rows[0]);
  },
};
