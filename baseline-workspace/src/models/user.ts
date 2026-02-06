export class User {
  id: string;
  name: string;
  email: string;

  constructor(id: string, name: string, email: string) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  validate(): boolean {
    if (!this.id || !this.name || !this.email) {
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  toJSON(): { id: string; name: string; email: string } {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
    };
  }
}
