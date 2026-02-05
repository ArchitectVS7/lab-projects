import { User } from '../types';

const users: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

let nextId = 3;

export const UserModel = {
  findAll: (): User[] => users,

  findById: (id: string): User | undefined => users.find(u => u.id === id),

  create: (name: string, email: string): User => {
    const user: User = { id: String(nextId++), name, email };
    users.push(user);
    return user;
  },
};
