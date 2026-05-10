'use strict';

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { query } = require('../db/pool');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'));

        // find or create user
        let { rows } = await query(
          'SELECT id, email, role FROM users WHERE email = $1',
          [email]
        );

        if (rows.length === 0) {
          const result = await query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id, email, role`,
            [email, 'GOOGLE_OAUTH_NO_PASSWORD']
          );
          rows = result.rows;
        }

        return done(null, rows[0]);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;