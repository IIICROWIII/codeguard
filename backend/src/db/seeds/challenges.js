'use strict';

module.exports = [
  {
    title: 'Fix SQL Injection in User Lookup',
    description:
      'The function below builds a SQL query by concatenating user input. Rewrite it to use parameterized queries so it is safe against SQL injection.',
    difficulty: 'security',
    starter_code: `function getUserByEmail(db, email) {
  const sql = "SELECT id, email FROM users WHERE email = '" + email + "'";
  return db.query(sql);
}`,
    expected_issues: ['SQL_INJECTION'],
  },
  {
    title: 'Escape User Output (XSS)',
    description:
      'This Express handler echoes a query parameter directly into the HTML response. Make it safe against reflected XSS.',
    difficulty: 'security',
    starter_code: `app.get('/hello', (req, res) => {
  const name = req.query.name;
  res.send('<h1>Hello ' + name + '</h1>');
});`,
    expected_issues: ['XSS'],
  },
  {
    title: 'Hash Passwords Properly',
    description:
      'The register handler stores passwords in plain text. Use bcrypt with at least 12 rounds.',
    difficulty: 'security',
    starter_code: `async function register(db, email, password) {
  await db.query('INSERT INTO users(email, password_hash) VALUES ($1, $2)', [email, password]);
}`,
    expected_issues: ['PLAINTEXT_PASSWORD'],
  },
  {
    title: 'Off-by-One in Array Sum',
    description: 'The loop below skips the last element. Fix the bounds.',
    difficulty: 'beginner',
    starter_code: `function sum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    total += arr[i];
  }
  return total;
}`,
    expected_issues: ['OFF_BY_ONE'],
  },
  {
    title: 'Null Check Before Access',
    description:
      'getUserName crashes when the user object is null. Add a safe null check and return a sensible default.',
    difficulty: 'beginner',
    starter_code: `function getUserName(user) {
  return user.profile.name.toUpperCase();
}`,
    expected_issues: ['NULL_DEREFERENCE'],
  },
  {
    title: 'Avoid Path Traversal',
    description:
      'This handler reads a file from disk based on a query parameter. Prevent path traversal attacks (e.g. ../../etc/passwd).',
    difficulty: 'security',
    starter_code: `app.get('/file', (req, res) => {
  const name = req.query.name;
  res.sendFile(path.join('/var/app/uploads', name));
});`,
    expected_issues: ['PATH_TRAVERSAL'],
  },
  {
    title: 'Validate JWT Before Trusting Claims',
    description:
      'The middleware decodes a JWT but never verifies its signature. Use jwt.verify with the secret instead of jwt.decode.',
    difficulty: 'intermediate',
    starter_code: `function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const payload = jwt.decode(token);
  req.user = payload;
  next();
}`,
    expected_issues: ['BROKEN_AUTH'],
  },
  {
    title: 'Use Parameterized Query in Search',
    description:
      'A search endpoint interpolates user input into a LIKE clause. Make it safe and case-insensitive.',
    difficulty: 'intermediate',
    starter_code: `function searchPosts(db, term) {
  return db.query("SELECT * FROM posts WHERE title LIKE '%" + term + "%'");
}`,
    expected_issues: ['SQL_INJECTION'],
  },
];
