import { User } from './models/user';

const user = new User('1', 'Alice', 'alice@example.com');

if (user.validate()) {
  console.log('User is valid:', user.toJSON());
} else {
  console.log('User validation failed');
}
