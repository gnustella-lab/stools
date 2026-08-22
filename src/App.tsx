import {useEffect} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavItem, TopNavHeading} from '@astryxdesign/core/TopNav';
import {NavIcon} from '@astryxdesign/core/NavIcon';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {ShieldCheckIcon} from '@heroicons/react/24/outline';
import {HOME_HREF, PRIVACY_HREF, useRoute} from './router';
import {PageFrame} from './components/PageFrame';
import Home from './pages/Home';
import Privacy from './pages/Privacy';
import ToolPage from './pages/ToolPage';
import {findTool} from './tools/registry';

const HOME_TITLE = 'sTools — Private tools that never leave your browser';

export default function App() {
  const route = useRoute();

  useEffect(() => {
    if (route.name === 'home') {
      document.title = HOME_TITLE;
      return;
    }
    if (route.name === 'privacy') {
      document.title = 'Privacy — sTools';
      return;
    }
    const tool = findTool(route.id);
    document.title = tool ? `${tool.name} — sTools` : 'Tool not found — sTools';
  }, [route]);

  return (
    <AppShell
      height="auto"
      variant="wash"
      contentPadding={0}
      topNav={
        <TopNav
          label="sTools navigation"
          heading={
            <TopNavHeading
              logo={
                <NavIcon icon={<ShieldCheckIcon width={18} height={18} />} />
              }
              heading="sTools"
              headingHref={HOME_HREF}
            />
          }
          startContent={
            <>
              <TopNavItem
                label="All tools"
                href={HOME_HREF}
                isSelected={route.name === 'home'}
              />
              <TopNavItem
                label="Privacy"
                href={PRIVACY_HREF}
                isSelected={route.name === 'privacy'}
              />
            </>
          }
          endContent={
            <HStack gap={2} vAlign="center">
              <StatusDot
                variant="success"
                label="All processing happens locally in your browser"
                tooltip="No data ever leaves this device"
              />
              <Text type="supporting" display="block">
                100% local
              </Text>
            </HStack>
          }
        />
      }
    >
      <PageFrame>
        {route.name === 'home' ? (
          <Home />
        ) : route.name === 'privacy' ? (
          <Privacy />
        ) : (
          <ToolPage id={route.id} />
        )}
      </PageFrame>
    </AppShell>
  );
}
