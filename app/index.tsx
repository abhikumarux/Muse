// Redirect to landing page by default
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/landing');
  }, [router]);
  return null;
}
