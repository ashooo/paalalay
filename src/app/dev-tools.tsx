import DevToolsScreen from '@/features/dev-tools/dev-tools-screen';

export default function DevToolsRoute() {
  if (!__DEV__) return null;
  return <DevToolsScreen />;
}
