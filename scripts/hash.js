// Genereer een veilige ADMIN_PASSWORD_HASH voor in je env.
// Gebruik: node scripts/hash.js 'jouwwachtwoord'
import { hashPassword } from '../lib/auth.js';

const pw = process.argv[2];
if (!pw) {
  console.error("Gebruik: node scripts/hash.js 'jouwwachtwoord'");
  process.exit(1);
}
console.log(hashPassword(pw));
