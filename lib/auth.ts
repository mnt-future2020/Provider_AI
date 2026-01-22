import { auth } from '@/auth';

export interface User {
  id: string;
  email: string;
  name: string;
}

export async function getSession(): Promise<User | null> {
  const session = await auth();
  
  if (!session?.user) return null;

  return {
    id: session.user.id!,
    email: session.user.email!,
    name: session.user.name!,
  };
}
