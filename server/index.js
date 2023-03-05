require('dotenv/config');
const express = require('express');
const staticMiddleware = require('./static-middleware');
const ClientError = require('./client-error');
const errorMiddleware = require('./error-middleware');
const axios = require('axios');
const crypto = require('node:crypto');
const path = require('path');
const uploadsMiddleware = require('./uploads-middleware');
const authorizationMiddleware = require('./authorization-middleware');

const pg = require('pg');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express();

const API_PUBLIC_KEY = 'b8483fd7fba99cd20a9fefc4e5106f88';
const API_PRIVATE_KEY = 'c2746ff73c66112e104538fe16622cbb21205d8f';

app.use(staticMiddleware);
app.use(express.json());

app.get('/marvel/character/:characterName', (req, res, next) => {

  const timestamp = Date.now().toString();
  const hash = crypto.createHash('md5').update(timestamp + API_PRIVATE_KEY + API_PUBLIC_KEY).digest('hex');
  const characterName = req.params.characterName;
  const url = `https://gateway.marvel.com/v1/public/characters?apikey=${API_PUBLIC_KEY}&ts=${timestamp}&hash=${hash}&name=${encodeURIComponent(characterName)}`;

  axios.get(url)
    .then(({ data: { data: { results } } }) => {
      if (results.length === 0) {
        throw new ClientError(404, `Could not find character with name '${characterName}'`);
      }
      const { name, description = 'None Available', thumbnail, comics } = results[0] || {};
      const characterThumbnailUrl = thumbnail ? `${thumbnail.path}.${thumbnail.extension}` : 'None Available';
      const characterComicAppearances = comics ? comics.available : 'None Available';

      const characterData = {
        name,
        description: description || 'None Available',
        thumbnailUrl: characterThumbnailUrl,
        comicAppearances: characterComicAppearances
      };

      res.status(200).json(characterData);
    })
    .catch((error) => {
      console.error(error);
      next(error);
    });
});

app.post('/marvel/registration', (req, res, next) => {
  const { username, password, email, profilePictureUrl } = req.body;
  if (!username || !password || !email) {
    throw new ClientError(400, 'username, password, and email are all required fields');
  }
  argon2
    .hash(password)
    .then((passwordHash) => {
      const usernameSql = `
        select "id", "username", "email", "createdAt" from "users" where "username" = $1 limit 1
      `;
      const usernameParams = [username];

      const emailSql = `
        select "id", "username", "email", "createdAt" from "users" where "email" = $1 limit 1
      `;
      const emailParams = [email];

      return Promise.all([
        db.query(usernameSql, usernameParams),
        db.query(emailSql, emailParams),
        Promise.resolve(passwordHash)
      ]);
    })
    .then(([usernameResult, emailResult, passwordHash]) => {
      if (usernameResult.rows.length > 0) {
        throw new ClientError(409, 'username already exists');
      }
      if (emailResult.rows.length > 0) {
        throw new ClientError(409, 'email already exists');
      }
      const sql = `
    insert into "users" ("username", "passwordHash", "email", "profilePictureUrl")
    values ($1, $2, $3, $4)
    on conflict do nothing
    returning "id", "username", "email", "createdAt", "profilePictureUrl"
  `;
      const params = [username, passwordHash, email, profilePictureUrl];
      return db.query(sql, params);
    })

    .then((result) => {
      if (result.rowCount === 0) {
        throw new ClientError(409, 'username or email already exists');
      } else {
        const [user] = result.rows;
        res.status(201).json(user);
      }
    })
    .catch((err) => next(err));
});

app.post('/marvel/upload', uploadsMiddleware, (req, res, next) => {
  res.status(200).send(req.file.filename);
});

app.post('/marvel/sign-in', (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ClientError(401, 'invalid login');
  }
  const sql = `
    select "id",
           "passwordHash",
           "profilePictureUrl"
      from "users"
     where "username" = $1
  `;

  const params = [username];
  db.query(sql, params)
    .then((result) => {
      const [user] = result.rows;
      if (!user) {
        throw new ClientError(401, 'invalid login');
      }
      const { id, passwordHash, profilePictureUrl } = user;
      return argon2
        .verify(passwordHash, password)
        .then((isMatching) => {
          if (!isMatching) {
            throw new ClientError(401, 'invalid login');
          }
          const token = jwt.sign({ userId: id }, process.env.TOKEN_SECRET);
          res.status(200).json({ token, profilePictureUrl });
        });
    })
    .catch((err) => {
      console.error('argon2.verify error', err);
      next(err);
    });
});

app.post('/marvel/demo', (req, res, next) => {

  const username = 'didyouknow';
  const password = 'Vaporeon!1';

  const sql = `
    select "id",
           "passwordHash",
           "profilePictureUrl",
           "username"
      from "users"
     where "username" = $1
  `;

  const params = [username];
  db.query(sql, params)
    .then((result) => {
      const [user] = result.rows;
      if (!user) {
        throw new ClientError(401, 'invalid login');
      }
      const { id, passwordHash, profilePictureUrl } = user;
      return argon2
        .verify(passwordHash, password)
        .then((isMatching) => {
          if (!isMatching) {
            throw new ClientError(401, 'invalid login');
          }
          const token = jwt.sign({ userId: id }, process.env.TOKEN_SECRET);
          res.status(200).json({ token, profilePictureUrl, username });
        });
    })
    .catch((err) => {
      console.error('argon2.verify error', err);
      next(err);
    });
});

app.post('/marvel/favorites', (req, res, next) => {
  const { selectedCharacter, user, action } = req.body;
  console.log('USER', user);
  if (!selectedCharacter) {
    throw new ClientError(400, 'selectedCharacter is a required field');
  }
  db.query(`
    SELECT id FROM characters WHERE name = $1
  `, [selectedCharacter.name])
    .then((result) => {
      if (result.rows.length > 0) {
        // The character already exists, so use its id
        const [existingCharacter] = result.rows;
        const characterId = existingCharacter.id;
        db.query(`
          SELECT id FROM users WHERE username = $1
        `, [user.username])
          .then((result) => {
            const [currentUser] = result.rows;
            const favoriteData = [currentUser.id, characterId];
            if (action === 'unfavorite') {
              db.query(`
                DELETE FROM favorites
                WHERE "userId" = $1 AND "characterId" = $2
              `, favoriteData)
                .then(() => {
                  res.status(200).json({ message: 'Successfully removed from favorites.' });
                })
                .catch((err) => next(err));
            } else {
              db.query(`
                INSERT INTO favorites ("userId", "characterId")
                VALUES ($1, $2)
                ON CONFLICT ("userId", "characterId")
                DO UPDATE SET "userId" = EXCLUDED."userId", "characterId" = EXCLUDED."characterId";
              `, favoriteData)
                .then(() => {
                  res.status(201).json(existingCharacter);
                })
                .catch((err) => next(err));
            }
          })
          .catch((err) => next(err));
      } else {
        // The character doesn't exist, so insert it and use its new id
        db.query(`
          INSERT INTO "characters" ("name", "description", "imageUrl", "comicAppearances")
          VALUES ($1, $2, $3, $4)
          RETURNING "id"
        `, [selectedCharacter.name, selectedCharacter.description, selectedCharacter.thumbnailUrl, selectedCharacter.comicAppearances])
          .then((result) => {
            const [newCharacter] = result.rows;
            db.query(`
              SELECT id FROM users WHERE username = $1
            `, [user.username])
              .then((result) => {
                const [currentUser] = result.rows;
                const favoriteData = [currentUser.id, newCharacter.id];
                if (action === 'unfavorite') {
                  // We can't delete a favorite that doesn't exist, so just return a success message
                  res.status(200).json({ message: 'Successfully removed from favorites.' });
                } else {
                  db.query(`
                    INSERT INTO favorites ("userId", "characterId")
                    VALUES ($1, $2)
                    ON CONFLICT ("userId", "characterId")
                    DO UPDATE SET "userId" = EXCLUDED."userId", "characterId" = EXCLUDED."characterId";
                  `, favoriteData)
                    .then(() => {
                      res.status(201).json(newCharacter);
                    })
                    .catch((err) => next(err));
                }
              })
              .catch((err) => next(err));
          })
          .catch((err) => next(err));
      }
    })
    .catch((err) => next(err));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use(authorizationMiddleware);

app.post('/marvel/sign-out', (req, res, next) => {
  res.clearCookie('token');
  res.status(200).json({
    message: 'You have been signed out'
  });
});

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  process.stdout.write(`\n\napp listening on port ${process.env.PORT}\n\n`);
});
