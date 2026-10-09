import ChatScreen from '@/features/chat/chat-screen';

export default function ChatRoute() {
  if (!__DEV__) return null;
  return <ChatScreen />;
}
