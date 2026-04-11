import { createDrawerNavigator } from '@react-navigation/drawer';
import { DemoScreen } from '../screens/DemoScreen';
import type { DemoSharedProps } from '../types';

const Drawer = createDrawerNavigator();

export function AppDrawer(props: DemoSharedProps) {
  return (
    <Drawer.Navigator
      initialRouteName="Demo Lab"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#17362f',
        },
        headerTintColor: '#fff6e8',
        headerTitleStyle: {
          fontWeight: '800',
        },
        drawerStyle: {
          backgroundColor: '#fffaf1',
        },
        drawerActiveTintColor: '#17362f',
        drawerInactiveTintColor: '#5f685f',
        drawerActiveBackgroundColor: '#e3f7ec',
      }}>
      <Drawer.Screen name="Demo Lab">{() => <DemoScreen mode="overview" {...props} />}</Drawer.Screen>
      <Drawer.Screen name="Workspace">{() => <DemoScreen mode="workspace" {...props} />}</Drawer.Screen>
      <Drawer.Screen name="Editor">{() => <DemoScreen mode="editor" {...props} />}</Drawer.Screen>
      <Drawer.Screen name="File Actions">{() => <DemoScreen mode="file" {...props} />}</Drawer.Screen>
      <Drawer.Screen name="Directory">{() => <DemoScreen mode="directory" {...props} />}</Drawer.Screen>
      <Drawer.Screen name="HTTPS Download">{() => <DemoScreen mode="remote" {...props} />}</Drawer.Screen>
      <Drawer.Screen name="Media Library">{() => <DemoScreen mode="media" {...props} />}</Drawer.Screen>
      <Drawer.Screen name="Results">{() => <DemoScreen mode="results" {...props} />}</Drawer.Screen>
      <Drawer.Screen name="Preview">{() => <DemoScreen mode="preview" {...props} />}</Drawer.Screen>
    </Drawer.Navigator>
  );
}
