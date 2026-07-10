import { useLocalSearchParams } from 'expo-router';
import { UserListScreen } from '../../../components/user/UserListScreen';

export default function FollowingScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <UserListScreen username={username!} mode="following" />;
}
