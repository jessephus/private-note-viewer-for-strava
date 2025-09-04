import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Activity, BarChart3, LogOut, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export function MainLayout({ children, onLogout, currentModule = 'private-notes', onModuleChange, apiStatus = 'available' }) {
  const activeModule = currentModule;

  const handleModuleChange = (moduleId) => {
    if (onModuleChange) {
      onModuleChange(moduleId);
    }
  };

  const getApiStatusIndicator = () => {
    switch (apiStatus) {
      case 'available':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          text: 'API Available'
        };
      case 'rate-limited':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          text: 'Rate Limited'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          text: 'API Error'
        };
      default:
        return {
          icon: Wifi,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          text: 'Unknown'
        };
    }
  };

  const menuItems = [
    {
      id: 'private-notes',
      title: 'Private Notes Viewer',
      icon: Activity,
      description: 'View and analyze your Strava activity private notes'
    },
    {
      id: 'weekly-mileage',
      title: 'Weekly Mileage Tracker',
      icon: BarChart3,
      description: 'Track your weekly running mileage progress',
      disabled: false,
      comingSoon: false
    }
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2">
            <Activity className="h-6 w-6 text-sidebar-primary" />
            <h1 className="text-lg font-semibold text-sidebar-foreground">Strava Tools</h1>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleModuleChange(item.id)}
                    isActive={activeModule === item.id}
                    disabled={item.disabled}
                    tooltip={item.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {item.comingSoon && (
                      <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${getApiStatusIndicator().bgColor}`}>
                {(() => {
                  const StatusIcon = getApiStatusIndicator().icon;
                  return <StatusIcon className={`h-3 w-3 ${getApiStatusIndicator().color}`} />;
                })()}
                <span className={`text-xs ${getApiStatusIndicator().color}`}>
                  {getApiStatusIndicator().text}
                </span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onLogout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            {menuItems.find(item => item.id === activeModule)?.icon && (
              (() => {
                const Icon = menuItems.find(item => item.id === activeModule).icon;
                return <Icon className="h-5 w-5 text-primary" />;
              })()
            )}
            <h1 className="text-xl font-semibold">
              {menuItems.find(item => item.id === activeModule)?.title || 'Strava Tools'}
            </h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}